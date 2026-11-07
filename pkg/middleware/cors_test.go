package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// UT-GO-19: TestCORS_OrigenPermitido_AgregaHeader verifica que una petición con Origin permitido en producción agregue los encabezados CORS.
// Satisface: RNF-04, VyV §3.3.
func TestCORS_OrigenPermitido_AgregaHeader(t *testing.T) {
	allowedOrigin := "https://lectorpobre.vercel.app"
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

	if gotVary := w.Header().Get("Vary"); gotVary != "Origin" {
		t.Errorf("Vary esperado 'Origin', obtenido %q", gotVary)
	}

	gotMethods := w.Header().Get("Access-Control-Allow-Methods")
	if !strings.Contains(gotMethods, "POST") || !strings.Contains(gotMethods, "OPTIONS") {
		t.Errorf("Access-Control-Allow-Methods esperado con POST y OPTIONS, obtenido %q", gotMethods)
	}
}

// UT-GO-20: TestCORS_OrigenNoPermitido_Retorna403 verifica que un Origin no autorizado retorne HTTP 403 y no incluya encabezados CORS.
// Satisface: RNF-04, VyV §3.3.
func TestCORS_OrigenNoPermitido_Retorna403(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.vercel.app")
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
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.vercel.app")
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
	allowedOrigin := "https://lectorpobre.vercel.app"
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
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.vercel.app,http://localhost:3000")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	req.Header.Set("Origin", "https://lectorpobre.vercel.app")
	w := httptest.NewRecorder()

	proceed := AplicarCORS(w, req)

	if !proceed {
		t.Fatalf("AplicarCORS esperaba true para origen en lista de permitidos")
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "https://lectorpobre.vercel.app" {
		t.Errorf("Access-Control-Allow-Origin incorrecto")
	}
}

// TestCORS_PreviewWildcard_PermitePreviewYRechazaEnProduccion verifica que ALLOWED_ORIGIN="*" funcione en Preview
// únicamente para subdominios *.vercel.app (y localhost), rechazando dominios externos y bloqueándose en Production (V-09).
func TestCORS_PreviewWildcard_PermitePreviewYRechazaEnProduccion(t *testing.T) {
	// 1. Entorno Preview: ALLOWED_ORIGIN="*" permite URLs dinámicas de preview (*.vercel.app) y localhost
	t.Setenv("VERCEL_ENV", "preview")
	t.Setenv("ALLOWED_ORIGIN", "*")

	reqPreview := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	reqPreview.Header.Set("Origin", "https://lectorpobre-git-feature.vercel.app")
	wPreview := httptest.NewRecorder()

	if !ApplyCORS(wPreview, reqPreview) {
		t.Fatalf("ApplyCORS esperaba true en entorno preview con comodín '*' para *.vercel.app")
	}
	if wPreview.Header().Get("Access-Control-Allow-Origin") != "https://lectorpobre-git-feature.vercel.app" {
		t.Errorf("Access-Control-Allow-Origin no configurado correctamente en preview")
	}
	if wPreview.Header().Get("Vary") != "Origin" {
		t.Errorf("Se esperaba Vary: Origin en preview")
	}

	reqPreviewLocal := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	reqPreviewLocal.Header.Set("Origin", "http://localhost:3000")
	wPreviewLocal := httptest.NewRecorder()
	if !ApplyCORS(wPreviewLocal, reqPreviewLocal) {
		t.Fatalf("ApplyCORS esperaba true en preview con '*' para localhost:3000")
	}

	// 2. Entorno Preview con ALLOWED_ORIGIN="*" rechaza dominios externos o esquemas inseguros
	for _, badOrigin := range []string{
		"https://sitio-malicioso.com",
		"https://vercel.app.evil.com",
		"http://lectorpobre-git-feature.vercel.app",
		"https://sub.nested.vercel.app",
		"https://lectorpobre.vercel.app:8443",
		"https://lectorpobre.vercel.app/ruta",
	} {
		reqBad := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
		reqBad.Header.Set("Origin", badOrigin)
		wBad := httptest.NewRecorder()
		if ApplyCORS(wBad, reqBad) || wBad.Code != http.StatusForbidden {
			t.Errorf("En preview con '*', el origen %q debió rechazarse con 403, obtuvo %d", badOrigin, wBad.Code)
		}
	}

	// 3. Entorno Production: ALLOWED_ORIGIN="*" se rechaza incluso para *.vercel.app (exige origen explícito)
	t.Setenv("VERCEL_ENV", "production")
	t.Setenv("ALLOWED_ORIGIN", "*")

	reqProdWildcard := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	reqProdWildcard.Header.Set("Origin", "https://lectorpobre-git-feature.vercel.app")
	wProdWildcard := httptest.NewRecorder()

	if ApplyCORS(wProdWildcard, reqProdWildcard) {
		t.Fatalf("ApplyCORS esperaba false en production cuando ALLOWED_ORIGIN='*'")
	}
	if wProdWildcard.Code != http.StatusForbidden {
		t.Errorf("Esperado 403 Forbidden con comodín '*' en production, obtenido %d", wProdWildcard.Code)
	}

	// 4. Entorno Production sin ALLOWED_ORIGIN usa por defecto https://lectorpobre.vercel.app
	t.Setenv("VERCEL_ENV", "production")
	t.Setenv("ALLOWED_ORIGIN", "")

	reqProdDefault := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	reqProdDefault.Header.Set("Origin", "https://lectorpobre.vercel.app")
	wProdDefault := httptest.NewRecorder()

	if !ApplyCORS(wProdDefault, reqProdDefault) {
		t.Fatalf("ApplyCORS debió permitir https://lectorpobre.vercel.app por defecto en production")
	}
	if wProdDefault.Header().Get("Access-Control-Allow-Origin") != "https://lectorpobre.vercel.app" {
		t.Errorf("Access-Control-Allow-Origin esperado https://lectorpobre.vercel.app, obtenido %q", wProdDefault.Header().Get("Access-Control-Allow-Origin"))
	}
}

// TestCORS_DefaultLocalhost_CuandoVariableVacia verifica que en desarrollo sin ALLOWED_ORIGIN se permita http://localhost:3000.
func TestCORS_DefaultLocalhost_CuandoVariableVacia(t *testing.T) {
	t.Setenv("VERCEL_ENV", "development")
	t.Setenv("ALLOWED_ORIGIN", "")

	req := httptest.NewRequest(http.MethodGet, "/api/buscar", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()

	if !ApplyCORS(w, req) {
		t.Fatalf("ApplyCORS debió permitir http://localhost:3000 por defecto en development")
	}
	if w.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Errorf("Access-Control-Allow-Origin inesperado: %q", w.Header().Get("Access-Control-Allow-Origin"))
	}
}

