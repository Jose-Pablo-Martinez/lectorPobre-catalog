package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// UT-GO-19: TestCORS_OrigenPermitido_AgregaHeader verifica que una petición con Origin permitido agregue los encabezados CORS.
// Satisface: RNF-04, VyV §3.3.
func TestCORS_OrigenPermitido_AgregaHeader(t *testing.T) {
	allowedOrigin := "https://lectorpobre.com"
	os.Setenv("ALLOWED_ORIGIN", allowedOrigin)
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
	req.Header.Set("Origin", allowedOrigin)
	w := httptest.NewRecorder()

	proceed := ApplyCORS(w, req)

	if !proceed {
		t.Fatalf("ApplyCORS esperaba true para origen permitido, se obtuvo false")
	}

	gotAllowOrigin := w.Header().Get("Access-Control-Allow-Origin")
	if gotAllowOrigin != allowedOrigin {
		t.Errorf("Access-Control-Allow-Origin esperado %q, obtenido %q", allowedOrigin, gotAllowOrigin)
	}

	gotMethods := w.Header().Get("Access-Control-Allow-Methods")
	if !strings.Contains(gotMethods, "POST") || !strings.Contains(gotMethods, "OPTIONS") {
		t.Errorf("Access-Control-Allow-Methods esperado con POST y OPTIONS, obtenido %q", gotMethods)
	}
}

// UT-GO-20: TestCORS_OrigenNoPermitido_Retorna403 verifica que un Origin no autorizado retorne HTTP 403 y no incluya encabezados CORS.
// Satisface: RNF-04, VyV §3.3.
func TestCORS_OrigenNoPermitido_Retorna403(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.com")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
	req.Header.Set("Origin", "https://otro-sitio.com")
	w := httptest.NewRecorder()

	proceed := ApplyCORS(w, req)

	if proceed {
		t.Fatalf("ApplyCORS esperaba false para origen no permitido, se obtuvo true")
	}

	if w.Code != http.StatusForbidden {
		t.Errorf("Código de estado esperado 403 Forbidden, obtenido %d", w.Code)
	}

	if allowOrigin := w.Header().Get("Access-Control-Allow-Origin"); allowOrigin != "" {
		t.Errorf("No se esperaba Access-Control-Allow-Origin para origen rechazado, obtenido %q", allowOrigin)
	}

	if !strings.Contains(w.Body.String(), "origen no permitido") {
		t.Errorf("Cuerpo de respuesta esperado 'origen no permitido', obtenido %q", w.Body.String())
	}
}

// UT-GO-21: TestCORS_SinOrigin_ProcesaNormalmente verifica que peticiones sin Origin continúen sin encabezados CORS.
// Satisface: RNF-04, VyV §3.3.
func TestCORS_SinOrigin_ProcesaNormalmente(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.com")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodPost, "/api/comentar", nil)
	w := httptest.NewRecorder()

	proceed := ApplyCORS(w, req)

	if !proceed {
		t.Fatalf("ApplyCORS esperaba true para petición sin Origin, se obtuvo false")
	}

	if allowOrigin := w.Header().Get("Access-Control-Allow-Origin"); allowOrigin != "" {
		t.Errorf("No se esperaba Access-Control-Allow-Origin para petición sin Origin, obtenido %q", allowOrigin)
	}
}

// TestCORS_PreflightOPTIONS_Retorna204YFalse verifica que una solicitud OPTIONS de preflight retorne 204 y detenga el procesamiento.
func TestCORS_PreflightOPTIONS_Retorna204YFalse(t *testing.T) {
	allowedOrigin := "https://lectorpobre.com"
	os.Setenv("ALLOWED_ORIGIN", allowedOrigin)
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodOptions, "/api/comentar", nil)
	req.Header.Set("Origin", allowedOrigin)
	w := httptest.NewRecorder()

	proceed := ApplyCORS(w, req)

	if proceed {
		t.Fatalf("ApplyCORS esperaba false para preflight OPTIONS, se obtuvo true")
	}

	if w.Code != http.StatusNoContent {
		t.Errorf("Código de estado esperado 204 No Content para OPTIONS, obtenido %d", w.Code)
	}

	if w.Header().Get("Access-Control-Allow-Origin") != allowedOrigin {
		t.Errorf("Encabezado CORS faltante en preflight OPTIONS")
	}
}

// TestCORS_MultipleAllowedOrigins_PermiteOrigenConfigurado verifica listas de orígenes permitidos separados por comas.
func TestCORS_MultipleAllowedOrigins_PermiteOrigenConfigurado(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.com,https://preview.lectorpobre.com")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	req.Header.Set("Origin", "https://preview.lectorpobre.com")
	w := httptest.NewRecorder()

	proceed := AplicarCORS(w, req)

	if !proceed {
		t.Fatalf("AplicarCORS esperaba true para origen en lista de permitidos")
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "https://preview.lectorpobre.com" {
		t.Errorf("Access-Control-Allow-Origin incorrecto")
	}
}

// TestCORS_Wildcard_PermiteCualquiera verifica comportamiento con comodín '*'.
func TestCORS_Wildcard_PermiteCualquiera(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "*")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	req.Header.Set("Origin", "https://otro-dominio.com")
	w := httptest.NewRecorder()

	proceed := ApplyCORS(w, req)
	if !proceed {
		t.Fatalf("ApplyCORS esperaba true con comodín '*'")
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "https://otro-dominio.com" {
		t.Errorf("Access-Control-Allow-Origin no configurado correctamente con comodín")
	}
}

