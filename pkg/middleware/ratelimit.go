// Package middleware implementa los controles de seguridad HTTP para las funciones serverless de LectorPobre.
// Satisface: RNF-04 (Limitación de tasa / Rate limiting — §9.5).
package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/tu-org/lectorpobre/pkg/constants"
)

// clientRecord guarda el historial de peticiones dentro de la ventana activa para una IP.
type clientRecord struct {
	timestamps []time.Time
}

// RateLimiter almacena en memoria el estado del limitador de tasa basado en IP.
// IMPORTANTE: En contenedores warm de Vercel, este mapa puede persistir entre invocaciones.
// En cold starts (contenedor nuevo), los contadores se reinician, lo cual es aceptable para este caso de uso.
// Si se requiriera persistencia estricta, se evaluaría un almacén externo como Upstash Redis (§9.6).
// Satisface: RNF-04 — protección contra abuso económico (§9.5).
type RateLimiter struct {
	mu          sync.Mutex
	clients     map[string]*clientRecord
	maxRequests int
	window      time.Duration
}

// NewRateLimiter crea una nueva instancia de RateLimiter con valores por defecto (10 peticiones/minuto).
func NewRateLimiter() *RateLimiter {
	return NewRateLimiterWithOptions(10, time.Minute)
}

// NewRateLimiterWithOptions crea una nueva instancia con límite y ventana personalizados.
func NewRateLimiterWithOptions(maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		clients:     make(map[string]*clientRecord),
		maxRequests: maxRequests,
		window:      window,
	}
}

// DefaultRateLimiter es la instancia compartida por defecto en el backend.
var DefaultRateLimiter = NewRateLimiter()

// GetClientIP extrae la dirección IP cliente desde las cabeceras HTTP o RemoteAddr.
// Prioriza cabeceras de proxy reverso (Vercel, Cloudflare) y limpia puertos si existen.
func GetClientIP(r *http.Request) string {
	// 1. Cabecera X-Forwarded-For (cliente original primero en lista separada por comas)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}

	// 2. Cabecera X-Real-IP
	xri := strings.TrimSpace(r.Header.Get("X-Real-IP"))
	if xri != "" {
		return xri
	}

	// 3. RemoteAddr del request (host:port)
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	if r.RemoteAddr != "" {
		return r.RemoteAddr
	}

	return "unknown"
}

// Allow comprueba si la IP especificada tiene cuota disponible bajo la ventana móvil.
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	record, exists := rl.clients[ip]
	if !exists {
		rl.clients[ip] = &clientRecord{timestamps: []time.Time{now}}
		return true
	}

	// Filtrar marcas de tiempo expiradas fuera de la ventana móvil
	valid := record.timestamps[:0]
	for _, t := range record.timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	record.timestamps = valid

	if len(record.timestamps) >= rl.maxRequests {
		return false
	}

	record.timestamps = append(record.timestamps, now)
	return true
}

// AllowRequest comprueba si la petición HTTP entrante está dentro del límite de tasa.
func (rl *RateLimiter) AllowRequest(r *http.Request) bool {
	ip := GetClientIP(r)
	return rl.Allow(ip)
}

// Limit comprueba si la IP de la solicitud entrante ha excedido el límite de tasa permitido.
// Retorna true si la petición se autoriza, o false (escribiendo HTTP 429) si es rechazada.
// Probado por: UT-GO-22, UT-GO-23 (VyV_LectorPobre.md §3.3).
func (rl *RateLimiter) Limit(w http.ResponseWriter, r *http.Request) bool {
	if !rl.AllowRequest(r) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":"` + constants.ErrCodes.RateLimit + `"}`))
		return false
	}
	return true
}

// Reset reinicia el mapa de clientes en memoria (útil para pruebas unitarias).
func (rl *RateLimiter) Reset() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.clients = make(map[string]*clientRecord)
}

// VerificarRateLimit valida si una petición no excede el límite utilizando la instancia por defecto.
// Utilizado en handlers serverless como /api/comentar y /api/calificar.
func VerificarRateLimit(r *http.Request, action string) bool {
	return DefaultRateLimiter.AllowRequest(r)
}
