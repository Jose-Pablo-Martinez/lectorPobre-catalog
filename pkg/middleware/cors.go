// Package middleware implementa los controles de seguridad HTTP para las funciones serverless de LectorPobre.
// Satisface: RNF-04 (Backend seguro sin estado — §9.4 CORS).
// TODO(Fase 5): Implementar la lógica completa de CORS. Issue #11.
package middleware

import "net/http"

// ApplyCORS configura encabezados CORS restrictivos para las funciones serverless de Go.
// Solo permite solicitudes desde el origen configurado en la variable de entorno ALLOWED_ORIGIN.
// Retorna true si la solicitud debe continuar procesándose, o false si fue rechazada o atendida (OPTIONS).
// Probado por: UT-GO-19 a UT-GO-21 (VyV_LectorPobre.md §3.3).
func ApplyCORS(w http.ResponseWriter, r *http.Request) bool {
	// TODO(RNF-04, §9.4): Implementar — leer ALLOWED_ORIGIN, validar encabezado Origin,
	// configurar encabezados Access-Control, gestionar preflight OPTIONS y rechazar orígenes desconocidos con 403.
	return true
}
