// Package middleware implementa los controles de seguridad HTTP para las funciones serverless de LectorPobre.
// Satisface: RNF-04 (Backend seguro sin estado — §9.4 CORS).
package middleware

import (
	"net/http"
	"os"
	"strings"
)

// ApplyCORS configura encabezados CORS restrictivos para las funciones serverless de Go.
// Solo permite solicitudes desde el origen configurado en la variable de entorno ALLOWED_ORIGIN.
// Retorna true si la solicitud debe continuar procesándose, o false si fue rechazada o atendida (OPTIONS).
// Probado por: UT-GO-19 a UT-GO-21 (VyV_LectorPobre.md §3.3).
func ApplyCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	allowed := os.Getenv("ALLOWED_ORIGIN")

	// Peticiones sin encabezado Origin (curl directo, llamadas internas server-to-server)
	// se procesan con normalidad sin agregar encabezados CORS (§3.3 UT-GO-21).
	if origin == "" {
		return true
	}

	// Comprobar si el origen está permitido (soporta comodín '*' o lista separada por comas)
	isAllowed := false
	if allowed == "*" || origin == allowed {
		isAllowed = true
	} else if strings.Contains(allowed, ",") {
		for _, o := range strings.Split(allowed, ",") {
			if strings.TrimSpace(o) == origin {
				isAllowed = true
				break
			}
		}
	}

	if isAllowed {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Sanity-Webhook-Signature")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return false
		}
		return true
	}

	// Origen desconocido o no autorizado: responder HTTP 403 Forbidden sin encabezados CORS (§3.3 UT-GO-20).
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_, _ = w.Write([]byte(`{"error":"origen no permitido"}`))
	return false
}

// AplicarCORS es el alias en español para ApplyCORS para compatibilidad con el plan de implementación.
func AplicarCORS(w http.ResponseWriter, r *http.Request) bool {
	return ApplyCORS(w, r)
}
