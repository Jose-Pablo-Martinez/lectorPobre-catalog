package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/tu-org/lectorpobre/pkg/constants"
)

// UT-GO-22: TestRateLimit_BajoLimite_Permite verifica que 5 peticiones seguidas bajo el límite (10/min) sean permitidas.
// Satisface: RNF-04, VyV §3.3.
func TestRateLimit_BajoLimite_Permite(t *testing.T) {
	limiter := NewRateLimiter()

	for i := 1; i <= 5; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
		req.RemoteAddr = "192.168.1.100:54321"
		w := httptest.NewRecorder()

		allowed := limiter.Limit(w, req)
		if !allowed {
			t.Fatalf("Petición %d debió ser permitida pero fue rechazada", i)
		}
		if w.Code != http.StatusOK {
			t.Errorf("Petición %d: Código no esperado %d", i, w.Code)
		}
	}
}

// UT-GO-23: TestRateLimit_SuperaLimite_Retorna429 verifica que la petición 11 en 1 minuto retorne HTTP 429.
// Satisface: RNF-04, VyV §3.3.
func TestRateLimit_SuperaLimite_Retorna429(t *testing.T) {
	limiter := NewRateLimiter()

	// Primeras 10 peticiones deben ser autorizadas
	for i := 1; i <= 10; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
		req.Header.Set("X-Forwarded-For", "203.0.113.195")
		w := httptest.NewRecorder()

		if !limiter.Limit(w, req) {
			t.Fatalf("Petición %d de 10 debió ser autorizada", i)
		}
	}

	// La 11ª petición debe ser rechazada con HTTP 429
	req11 := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
	req11.Header.Set("X-Forwarded-For", "203.0.113.195")
	w11 := httptest.NewRecorder()

	if limiter.Limit(w11, req11) {
		t.Fatalf("La 11ª petición debió ser rechazada por exceder el límite de tasa")
	}

	if w11.Code != http.StatusTooManyRequests {
		t.Errorf("Código de estado esperado 429 Too Many Requests, obtenido %d", w11.Code)
	}

	if !strings.Contains(w11.Body.String(), constants.ErrCodes.RateLimit) {
		t.Errorf("Cuerpo de respuesta esperado con %q, obtenido %q", constants.ErrCodes.RateLimit, w11.Body.String())
	}
}

// TestRateLimit_XForwardedFor_ExtraePrimerIP verifica que se tome la primera IP de la cadena de proxies.
func TestRateLimit_XForwardedFor_ExtraePrimerIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("X-Forwarded-For", "198.51.100.1, 198.51.100.2, 198.51.100.3")

	ip := GetClientIP(req)
	if ip != "198.51.100.1" {
		t.Errorf("GetClientIP esperado '198.51.100.1', obtenido %q", ip)
	}
}

// TestRateLimit_XRealIP_ExtraeIP verifica que se utilice X-Real-IP cuando no hay X-Forwarded-For.
func TestRateLimit_XRealIP_ExtraeIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("X-Real-IP", "203.0.113.42")

	ip := GetClientIP(req)
	if ip != "203.0.113.42" {
		t.Errorf("GetClientIP esperado '203.0.113.42', obtenido %q", ip)
	}
}

// TestRateLimit_RemoteAddr_SinPuerto verifica la extracción limpia de IP desde RemoteAddr con puerto.
func TestRateLimit_RemoteAddr_SinPuerto(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.RemoteAddr = "10.0.0.5:12345"

	ip := GetClientIP(req)
	if ip != "10.0.0.5" {
		t.Errorf("GetClientIP esperado '10.0.0.5', obtenido %q", ip)
	}
}

// TestRateLimit_VentanaExpirada_PermiteNuevasPeticiones verifica que transcurrida la ventana se restablezca la cuota.
func TestRateLimit_VentanaExpirada_PermiteNuevasPeticiones(t *testing.T) {
	limiter := NewRateLimiterWithOptions(2, 50*time.Millisecond)

	req := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
	req.RemoteAddr = "127.0.0.1:8080"

	w1 := httptest.NewRecorder()
	if !limiter.Limit(w1, req) {
		t.Fatal("Petición 1 debió ser permitida")
	}

	w2 := httptest.NewRecorder()
	if !limiter.Limit(w2, req) {
		t.Fatal("Petición 2 debió ser permitida")
	}

	w3 := httptest.NewRecorder()
	if limiter.Limit(w3, req) {
		t.Fatal("Petición 3 debió ser rechazada (límite 2 alcanzado)")
	}

	// Esperar que la ventana móvil expire
	time.Sleep(60 * time.Millisecond)

	w4 := httptest.NewRecorder()
	if !limiter.Limit(w4, req) {
		t.Fatal("Petición 4 debió ser permitida tras expirar la ventana")
	}
}

// TestRateLimit_Concurrente_SeguridadDeHilos valida que múltiples goroutines puedan invocar el limitador sin condiciones de carrera.
func TestRateLimit_Concurrente_SeguridadDeHilos(t *testing.T) {
	limiter := NewRateLimiterWithOptions(50, time.Minute)
	var wg sync.WaitGroup

	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodPost, "/api/calificar", nil)
			req.RemoteAddr = "192.168.1.50:1111"
			w := httptest.NewRecorder()
			_ = limiter.Limit(w, req)
		}(i)
	}

	wg.Wait()
}

// TestVerificarRateLimit_FuncionGlobal verifica el wrapper funcional VerificarRateLimit.
func TestVerificarRateLimit_FuncionGlobal(t *testing.T) {
	DefaultRateLimiter.Reset()

	req := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
	req.RemoteAddr = "192.168.1.77:80"

	if !VerificarRateLimit(req, "comentar") {
		t.Error("VerificarRateLimit esperado true para primera solicitud")
	}
}

