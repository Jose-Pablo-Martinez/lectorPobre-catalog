// Package handler implementa la función serverless para el registro de calificaciones de productos.
// Satisface: RF-06 (Calificaciones de usuarios de 1 a 5 estrellas),
// RNF-04 (Backend seguro sin estado, rate limiting, CORS y protección de credenciales).
package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/tu-org/lectorpobre/pkg/constants"
	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/middleware"
	"github.com/tu-org/lectorpobre/pkg/sanity"
)

var defaultSanityWriter sanity.Writer

// SetSanityWriter permite inyectar un mock de sanity.Writer durante las pruebas unitarias.
func SetSanityWriter(w sanity.Writer) {
	defaultSanityWriter = w
}

func getSanityWriter() (sanity.Writer, error) {
	if defaultSanityWriter != nil {
		return defaultSanityWriter, nil
	}
	return sanity.NewClient()
}

// Handler procesa la recepción de una nueva calificación para un producto.
// Endpoint: POST /api/rating (y /api/calificar)
//
// Retorna:
//   - 201 Created si la calificación se registró exitosamente en Sanity.
//   - 400 Bad Request si el valor está fuera del rango [1, 5], el productId está vacío o el payload es inválido.
//   - 403 Forbidden si el Origin no está autorizado por CORS.
//   - 405 Method Not Allowed si el método HTTP no es POST.
//   - 429 Too Many Requests si se supera el rate limit por IP (10 req/min).
//   - 500 Internal Server Error si falla la comunicación con Sanity.
func Handler(w http.ResponseWriter, r *http.Request) {
	// 1. Guard contra panics: garantiza que nunca se expongan trazas de ejecución (RNF-04, UT-GO-18)
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("[PANIC RECOVERED] RatingHandler: %v", rec)
			handlers.SendInternalError(w)
		}
	}()

	// 2, 3, 4. Control CORS, verificación de método POST y Content-Type JSON
	if !handlers.ValidateJSONPostRequest(w, r) {
		return
	}

	// 5. Rate limiting por IP (§9.5, UT-GO-22..23)
	if !middleware.VerificarRateLimit(r, "calificar") {
		handlers.SendError(w, http.StatusTooManyRequests, "demasiadas solicitudes", constants.ErrCodes.RateLimit)
		return
	}

	// 6. Decodificación de payload JSON
	var payload handlers.RatingPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		handlers.SendError(w, http.StatusBadRequest, "payload inválido", constants.ErrCodes.InvalidPayload)
		return
	}

	// 7. Validación de campos de negocio (RF-06: rango [1, 5], UT-GO-05..07, UT-GO-16)
	if err := handlers.ValidateRating(payload); err != nil {
		handlers.SendError(w, http.StatusBadRequest, err.Error(), constants.ErrCodes.RatingOutOfRange)
		return
	}

	// 8. Escritura en Sanity con token privado (RNF-04, §8, §9.9)
	writer, err := getSanityWriter()
	if err != nil {
		log.Printf("[ERROR] RatingHandler: error al inicializar cliente Sanity: %v", err)
		handlers.SendInternalError(w)
		return
	}

	if err := writer.CreateRating(r.Context(), payload.ProductID, payload.Value); err != nil {
		log.Printf("[ERROR] RatingHandler: error al escribir calificación en Sanity: %v", err)
		handlers.SendInternalError(w)
		return
	}

	// 9. Respuesta exitosa HTTP 201 Created (UT-GO-15)
	handlers.SendSuccess(w, http.StatusCreated, nil)
}
