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

const defaultMaxClients = 10000

// clientRecord guarda el historial de peticiones dentro de la ventana activa para una clave (acción + IP).
type clientRecord struct {
	timestamps []time.Time
}

// RateLimiter almacena en memoria el estado del limitador de tasa basado en clave (acción|IP).
// Incluye limpieza periódica de entradas expiradas y un tope máximo de llaves para evitar
// crecimiento ilimitado de memoria ante ráfagas de IPs distintas (V-09).
// Satisface: RNF-04 — protección contra abuso económico (§9.5).
type RateLimiter struct {
	mu          sync.Mutex
	clients     map[string]*clientRecord
	maxRequests int
	window      time.Duration
	maxClients  int
	lastCleanup time.Time
}

// NewRateLimiter crea una nueva instancia de RateLimiter con valores por defecto (10 peticiones/minuto).
func NewRateLimiter() *RateLimiter {
	return NewRateLimiterWithOptions(10, time.Minute)
}

// NewRateLimiterWithOptions crea una nueva instancia con límite y ventana personalizados.
func NewRateLimiterWithOptions(maxRequests int, window time.Duration) *RateLimiter {
	return NewRateLimiterWithMaxClients(maxRequests, window, defaultMaxClients)
}

// NewRateLimiterWithMaxClients crea una nueva instancia con límite, ventana y tope máximo de clientes en memoria.
func NewRateLimiterWithMaxClients(maxRequests int, window time.Duration, maxClients int) *RateLimiter {
	if maxClients <= 0 {
		maxClients = defaultMaxClients
	}
	return &RateLimiter{
		clients:     make(map[string]*clientRecord),
		maxRequests: maxRequests,
		window:      window,
		maxClients:  maxClients,
	}
}

// DefaultRateLimiter es la instancia compartida por defecto en el backend.
var DefaultRateLimiter = NewRateLimiter()

func extractFirstHeaderIP(r *http.Request, headerName string) string {
	raw := r.Header.Get(headerName)
	if raw == "" {
		return ""
	}
	parts := strings.Split(raw, ",")
	return strings.TrimSpace(parts[0])
}

// GetClientIP extrae la dirección IP cliente desde las cabeceras HTTP o RemoteAddr.
// Prioriza X-Vercel-Forwarded-For (inyectada por el edge de Vercel), luego X-Forwarded-For,
// X-Real-IP y finalmente RemoteAddr sin puerto (V-09).
func GetClientIP(r *http.Request) string {
	for _, header := range []string{"X-Vercel-Forwarded-For", "X-Forwarded-For", "X-Real-IP"} {
		if ip := extractFirstHeaderIP(r, header); ip != "" {
			return ip
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	if r.RemoteAddr != "" {
		return r.RemoteAddr
	}

	return "unknown"
}

func (rl *RateLimiter) evictExpiredLocked(cutoff time.Time) {
	for key, rec := range rl.clients {
		valid := rec.timestamps[:0]
		for _, t := range rec.timestamps {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		if len(valid) == 0 {
			delete(rl.clients, key)
		} else {
			rec.timestamps = valid
		}
	}
}

// Allow comprueba si la clave especificada tiene cuota disponible bajo la ventana móvil.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	if rl.lastCleanup.IsZero() || now.Sub(rl.lastCleanup) >= rl.window {
		rl.evictExpiredLocked(cutoff)
		rl.lastCleanup = now
	}

	record, exists := rl.clients[key]
	if !exists {
		maxCap := rl.maxClients
		if maxCap <= 0 {
			maxCap = defaultMaxClients
		}
		if len(rl.clients) >= maxCap {
			rl.evictExpiredLocked(cutoff)
			rl.lastCleanup = now
			if len(rl.clients) >= maxCap {
				return false
			}
		}
		rl.clients[key] = &clientRecord{timestamps: []time.Time{now}}
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

// AllowRequest comprueba si la petición HTTP entrante está dentro del límite de tasa por IP.
func (rl *RateLimiter) AllowRequest(r *http.Request) bool {
	return rl.AllowActionRequest(r, "")
}

// AllowActionRequest comprueba si la petición HTTP entrante está dentro del límite para una acción e IP específicas (V-09).
func (rl *RateLimiter) AllowActionRequest(r *http.Request, action string) bool {
	ip := GetClientIP(r)
	trimmedAction := strings.TrimSpace(action)
	if trimmedAction == "" {
		return rl.Allow(ip)
	}
	return rl.Allow(trimmedAction + "|" + ip)
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
	rl.lastCleanup = time.Time{}
}

// VerificarRateLimit valida si una petición no excede el límite para la acción indicada utilizando la instancia por defecto (V-09).
// Utilizado en handlers serverless como /api/comment, /api/rating y /api/search.
func VerificarRateLimit(r *http.Request, action string) bool {
	return DefaultRateLimiter.AllowActionRequest(r, action)
}
