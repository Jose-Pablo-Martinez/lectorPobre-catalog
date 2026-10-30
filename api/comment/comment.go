// Package handler implementa la función serverless para la publicación de comentarios sobre productos.
// Satisface: RF-07 (Comentarios de usuarios con moderación previa en estado pendiente),
// RNF-04 (Backend seguro sin estado, rate limiting, CORS y protección de tokens privados).
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

// Handler procesa la recepción de un comentario para un producto.
// Endpoint: POST /api/comment (y /api/comentar)
//
// Retorna:
//   - 201 Created si el comentario se guardó en Sanity en estado pendiente.
//   - 400 Bad Request si el payload es inválido o falta el encabezado Content-Type.
//   - 403 Forbidden si el Origin no está autorizado por CORS.
//   - 405 Method Not Allowed si el método HTTP no es POST.
//   - 429 Too Many Requests si se supera el rate limit por IP (10 req/min).
//   - 500 Internal Server Error si falla la comunicación con Sanity (mensaje genérico al cliente).
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", applicationJSON)

	// 1. Guard contra panics: asegura que nunca se expongan trazas de ejecución (RNF-04, UT-GO-18)
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("[PANIC RECOVERED] CommentHandler: %v", rec)
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

	// 3. Verificación de método HTTP (UT-GO-13)
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: "método no permitido",
			Code:  constants.ErrCodes.Unauthorized,
		})
		return
	}

	// 4. Verificación de cabecera Content-Type requerida (UT-GO-14)
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
	if !middleware.VerificarRateLimit(r, "comentar") {
		w.WriteHeader(http.StatusTooManyRequests)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: "demasiadas solicitudes",
			Code:  constants.ErrCodes.RateLimit,
		})
		return
	}

	// 6. Decodificación de payload JSON (UT-GO-12)
	var payload handlers.CommentPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: "payload inválido",
			Code:  constants.ErrCodes.InvalidPayload,
		})
		return
	}

	// 7. Validación de campos de negocio (RF-07, UT-GO-01..04)
	if err := handlers.ValidateComment(payload); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: err.Error(),
			Code:  constants.ErrCodes.InvalidPayload,
		})
		return
	}

	// 8. Escritura en Sanity usando token privado (RNF-04, §8, §9.9)
	writer, err := getSanityWriter()
	if err != nil {
		log.Printf("[ERROR] CommentHandler: error al inicializar cliente Sanity: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: errInternalMsg,
			Code:  constants.ErrCodes.InternalError,
		})
		return
	}

	if err := writer.CreateComment(r.Context(), payload.ProductID, payload.Text); err != nil {
		log.Printf("[ERROR] CommentHandler: error al escribir en Sanity: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
			Ok:    false,
			Error: errInternalMsg,
			Code:  constants.ErrCodes.InternalError,
		})
		return
	}

	// 9. Respuesta exitosa HTTP 201 Created (UT-GO-11)
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(handlers.ApiResponse{
		Ok: true,
	})
}
