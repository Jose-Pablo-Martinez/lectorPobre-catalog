// Package handlers centraliza utilidades de respuesta y validación HTTP compartidas.
package handlers

import (
	"encoding/json"
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

