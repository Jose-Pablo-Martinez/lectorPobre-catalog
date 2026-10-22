// Package handler implementa la función serverless de cierre de sesión administrativo.
// TODO(RF-09): Implementar invalidación de JWT (expiración corta o denylist en memoria). Issue #9.
// Satisface: RF-09 (Cierre de sesión de admin), RNF-04 (Gestión de tokens sin estado).
package handler

import "net/http"

// Handler es el punto de entrada de la función serverless de Vercel para POST /api/auth/logout.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
