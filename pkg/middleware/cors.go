// Package middleware implementa los controles de seguridad HTTP para las funciones serverless de LectorPobre.
// Satisface: RNF-04 (Backend seguro sin estado — §9.4 CORS).
package middleware

import (
	"net/http"
	"net/url"
	"os"
	"strings"
)

const (
	defaultProductionOrigin  = "https://lectorpobre.vercel.app"
	defaultDevelopmentOrigin = "http://localhost:3000,http://127.0.0.1:3000"
	vercelAppDomainSuffix    = ".vercel.app"
)

// isSafePreviewOrigin valida que, cuando ALLOWED_ORIGIN="*" fuera de producción, solo se autoricen
// subdominios HTTPS legítimos de Vercel (https://<preview>.vercel.app) o localhost de desarrollo.
func isSafePreviewOrigin(origin string) bool {
	if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
		return true
	}

	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme != "https" || parsed.User != nil || parsed.Port() != "" {
		return false
	}
	if parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" {
		return false
	}

	host := strings.ToLower(parsed.Hostname())
	if !strings.HasSuffix(host, vercelAppDomainSuffix) {
		return false
	}

	sub := strings.TrimSuffix(host, vercelAppDomainSuffix)
	return sub != "" && !strings.Contains(sub, ".")
}

// isOriginAllowed verifica si el encabezado Origin coincide con los orígenes configurados en ALLOWED_ORIGIN.
// En producción (VERCEL_ENV=production) el comodín '*' se rechaza por seguridad (V-09) y se exige
// coincidencia exacta (https://lectorpobre.vercel.app). En entornos de preview/development el comodín '*'
// solo autoriza subdominios HTTPS de Vercel (*.vercel.app) y localhost.
func isOriginAllowed(origin, allowedList string, isProduction bool) bool {
	for _, entry := range strings.Split(allowedList, ",") {
		candidate := strings.Trim(strings.TrimSpace(entry), `"'`)
		if candidate == "" {
			continue
		}
		if candidate == "*" {
			if !isProduction && isSafePreviewOrigin(origin) {
				return true
			}
			continue
		}
		if candidate == origin {
			return true
		}
	}
	return false
}

// ApplyCORS configura encabezados CORS restrictivos para las funciones serverless de Go.
// Solo permite solicitudes desde el origen configurado en la variable de entorno ALLOWED_ORIGIN:
//   - Production: https://lectorpobre.vercel.app (sin comodín '*')
//   - Preview: * (URLs dinámicas de Vercel preview)
//   - Development: http://localhost:3000
//
// Retorna true si la solicitud debe continuar procesándose, o false si fue rechazada o atendida (OPTIONS).
// Probado por: UT-GO-19 a UT-GO-21 (VyV_LectorPobre.md §3.3).
func ApplyCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")

	// Peticiones sin encabezado Origin (curl directo, llamadas internas server-to-server)
	// se procesan con normalidad sin agregar encabezados CORS (§3.3 UT-GO-21).
	if origin == "" {
		return true
	}

	w.Header().Set("Vary", "Origin")

	isProduction := strings.EqualFold(strings.TrimSpace(os.Getenv("VERCEL_ENV")), "production")
	allowed := strings.Trim(strings.TrimSpace(os.Getenv("ALLOWED_ORIGIN")), `"'`)
	if allowed == "" {
		if isProduction {
			allowed = defaultProductionOrigin
		} else {
			allowed = defaultDevelopmentOrigin
		}
	}

	if isOriginAllowed(origin, allowed, isProduction) {
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
