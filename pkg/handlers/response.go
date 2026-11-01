// Package handlers centraliza utilidades de respuesta y validación HTTP compartidas.
package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/tu-org/lectorpobre/pkg/constants"
	"github.com/tu-org/lectorpobre/pkg/middleware"
)

const (
	errInternalMsg  = "error interno"
	applicationJSON = "application/json"
)

// SendJSON escribe una respuesta ApiResponse en formato JSON con el código HTTP correspondiente.
func SendJSON(w http.ResponseWriter, status int, resp ApiResponse) {
	w.Header().Set("Content-Type", applicationJSON)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(resp)
}

// SendError escribe una respuesta ApiResponse de error estandarizada.
func SendError(w http.ResponseWriter, status int, errMsg, errCode string) {
	SendJSON(w, status, ApiResponse{
		Ok:    false,
		Error: errMsg,
		Code:  errCode,
	})
}

// SendInternalError escribe un error 500 genérico sin exponer detalles internos (RNF-04).
func SendInternalError(w http.ResponseWriter) {
	SendError(w, http.StatusInternalServerError, errInternalMsg, constants.ErrCodes.InternalError)
}

// SendSuccess escribe una respuesta HTTP exitosa (200 OK o 201 Created) con datos opcionales.
func SendSuccess(w http.ResponseWriter, status int, data any) {
	SendJSON(w, status, ApiResponse{
		Ok:   true,
		Data: data,
	})
}

// ValidateJSONPostRequest valida CORS, método HTTP POST y cabecera Content-Type application/json.
// Si alguna validación falla, envía la respuesta de error correspondiente y retorna false.
func ValidateJSONPostRequest(w http.ResponseWriter, r *http.Request) bool {
	if !middleware.ApplyCORS(w, r) {
		return false
	}

	if r.Method != http.MethodPost {
		SendError(w, http.StatusMethodNotAllowed, "método no permitido", constants.ErrCodes.Unauthorized)
		return false
	}

	contentType := r.Header.Get("Content-Type")
	if !strings.HasPrefix(strings.ToLower(contentType), applicationJSON) {
		SendError(w, http.StatusBadRequest, "Content-Type debe ser application/json", constants.ErrCodes.InvalidPayload)
		return false
	}

	return true
}

// MutationConfig contiene la configuración para procesar una mutación POST serverless.
type MutationConfig[T any] struct {
	HandlerName string
	ActionName  string
	Decode      func(r *http.Request) (T, error)
	Validate    func(payload T) error
	ErrorCode   string
	Execute     func(ctx context.Context, payload T) error
}

// ExecuteMutation ejecuta el ciclo estándar de una función serverless de mutación POST en Sanity:
// 1. Recuperación de panics con respuesta 500 genérica (RNF-04).
// 2. Validación de CORS, método POST y cabecera Content-Type application/json.
// 3. Rate limiting por IP.
// 4. Decodificación de payload JSON.
// 5. Validación de negocio.
// 6. Ejecución de la operación (escritura en Sanity).
// 7. Respuesta exitosa HTTP 201 Created.
func ExecuteMutation[T any](w http.ResponseWriter, r *http.Request, cfg MutationConfig[T]) {
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("[PANIC RECOVERED] %s: %v", cfg.HandlerName, rec)
			SendInternalError(w)
		}
	}()

	if !ValidateJSONPostRequest(w, r) {
		return
	}

	if !middleware.VerificarRateLimit(r, cfg.ActionName) {
		SendError(w, http.StatusTooManyRequests, "demasiadas solicitudes", constants.ErrCodes.RateLimit)
		return
	}

	payload, err := cfg.Decode(r)
	if err != nil {
		SendError(w, http.StatusBadRequest, "payload inválido", constants.ErrCodes.InvalidPayload)
		return
	}

	if err := cfg.Validate(payload); err != nil {
		errCode := cfg.ErrorCode
		if errCode == "" {
			errCode = constants.ErrCodes.InvalidPayload
		}
		SendError(w, http.StatusBadRequest, err.Error(), errCode)
		return
	}

	if err := cfg.Execute(r.Context(), payload); err != nil {
		log.Printf("[ERROR] %s: error en ejecución de mutación: %v", cfg.HandlerName, err)
		SendInternalError(w)
		return
	}

	SendSuccess(w, http.StatusCreated, nil)
}
