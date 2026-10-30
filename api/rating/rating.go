// Package handler implementa la función serverless para la calificación de productos mediante estrellas.
// Satisface: RF-06 (Calificaciones de 1 a 5 estrellas), RNF-04 (Backend seguro, validación estricta y protección de tokens).
package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/tu-org/lectorpobre/pkg/constants"
	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/middleware"
	"github.com/tu-org/lectorpobre/pkg/sanity"
)

const (
	errInternalMsg  = "error interno"
	applicationJSON = "application/json"
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
	w.Header().Set("Content-Type", applicationJSON)

	// 1. Guard contra panics: garantiza que nunca se expongan trazas de ejecución (RNF-04, UT-GO-18)
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("[PANIC RECOVERED] RatingHandler: %v", rec)
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
				Ok:    false,
				Error: errInternalMsg,
				Code:  constants.ErrCodes.InternalError,
			})
		}
	}()

	// 2. Control CORS restrictivo (§9.4, UT-GO-19..21)
	if !middleware.ApplyCORS(w, r) {
		return
	}

	// 3. Verificación de método HTTP (POST requerido)
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: "método no permitido",
			Code:  constants.ErrCodes.Unauthorized,
		})
		return
	}

	// 4. Verificación de cabecera Content-Type requerida
	contentType := r.Header.Get("Content-Type")
	if !strings.HasPrefix(strings.ToLower(contentType), applicationJSON) {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: "Content-Type debe ser application/json",
			Code:  constants.ErrCodes.InvalidPayload,
		})
		return
	}

	// 5. Rate limiting por IP (§9.5, UT-GO-22..23)
	if !middleware.VerificarRateLimit(r, "calificar") {
		w.WriteHeader(http.StatusTooManyRequests)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: "demasiadas solicitudes",
			Code:  constants.ErrCodes.RateLimit,
		})
		return
	}

	// 6. Decodificación de payload JSON
	var payload handlers.RatingPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: "payload inválido",
			Code:  constants.ErrCodes.InvalidPayload,
		})
		return
	}

	// 7. Validación de campos de negocio (RF-06: rango [1, 5], UT-GO-05..07, UT-GO-16)
	if err := handlers.ValidateRating(payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: err.Error(),
			Code:  constants.ErrCodes.RatingOutOfRange,
		})
		return
	}

	// 8. Escritura en Sanity con token privado (RNF-04, §8, §9.9)
	writer, err := getSanityWriter()
	if err != nil {
		log.Printf("[ERROR] RatingHandler: error al inicializar cliente Sanity: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: errInternalMsg,
			Code:  constants.ErrCodes.InternalError,
		})
		return
	}

	if err := writer.CreateRating(r.Context(), payload.ProductID, payload.Value); err != nil {
		log.Printf("[ERROR] RatingHandler: error al escribir calificación en Sanity: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: errInternalMsg,
			Code:  constants.ErrCodes.InternalError,
		})
		return
	}

	// 9. Respuesta exitosa HTTP 201 Created (UT-GO-15)
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
		Ok: true,
	})
}
