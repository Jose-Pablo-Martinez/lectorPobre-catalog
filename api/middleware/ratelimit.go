// Package middleware implementa los controles de seguridad HTTP para las funciones serverless de LectorPobre.
// Satisface: RNF-04 (Limitación de tasa / Rate limiting — §9.5).
// TODO(Fase 5): Implementar la lógica completa de rate limiting. Issue #12.
package middleware

import "net/http"

// RateLimiter almacena en memoria el estado del limitador de tasa basado en IP.
// IMPORTANTE: En contenedores warm de Vercel, este mapa puede persistir entre invocaciones.
// En cold starts (contenedor nuevo), los contadores se reinician, lo cual es aceptable para este caso de uso.
// Si se requiriera persistencia estricta, se evaluaría un almacén externo como Upstash Redis.
type RateLimiter struct {
	// TODO(Fase 5): Agregar campos — mapa de IPs, mutex, duración de ventana, peticiones máximas.
}

// NewRateLimiter crea una nueva instancia de RateLimiter con valores por defecto (10 peticiones/minuto).
func NewRateLimiter() *RateLimiter {
	// TODO(Fase 5): Inicializar mapa y configurar ventana/límite.
	return &RateLimiter{}
}

// Limit comprueba si la IP de la solicitud entrante ha excedido el límite de tasa permitido.
// Retorna true si la petición se autoriza, o false (escribiendo HTTP 429) si es rechazada.
// Probado por: UT-GO-22, UT-GO-23 (VyV_LectorPobre.md §3.3).
func (rl *RateLimiter) Limit(w http.ResponseWriter, r *http.Request) bool {
	// TODO(RNF-04, §9.5): Implementar — extraer IP, verificar contador, emitir 429 si se excede.
	return true
}
