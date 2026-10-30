package handler_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"

	handler "github.com/tu-org/lectorpobre/api/search"
	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/middleware"
)

type mockSearcher struct {
	searchProductsFunc func(ctx context.Context, query string) ([]map[string]interface{}, error)
}

func (m *mockSearcher) SearchProducts(ctx context.Context, query string) ([]map[string]interface{}, error) {
	if m.searchProductsFunc != nil {
		return m.searchProductsFunc(ctx, query)
	}
	return []map[string]interface{}{}, nil
}

// UT-GO-17: TestBuscarHandler_QueryValida_Retorna200 verifica la respuesta HTTP 200 ante una búsqueda válida.
// Satisface: RF-18, VyV §3.2.
func TestBuscarHandler_QueryValida_Retorna200(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	var capturedQuery string
	mock := &mockSearcher{
		searchProductsFunc: func(ctx context.Context, query string) ([]map[string]interface{}, error) {
			capturedQuery = query
			return []map[string]interface{}{
				{"_id": "prod-1", "nombre": "Libro de Cuentos", "precio": 150.0},
			}, nil
		},
	}
	handler.SetSanitySearcher(mock)

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=libro", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Esperado status 200 OK, obtenido %d. Body: %s", w.Code, w.Body.String())
	}

	var resp handlers.ApiResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if !resp.Ok {
		t.Errorf("Se esperaba resp.Ok == true")
	}

	if capturedQuery != "libro" {
		t.Errorf("Query enviada a Sanity esperada 'libro', obtenida %q", capturedQuery)
	}
}

// TestBuscarHandler_QueryVacia_Retorna400 verifica que una búsqueda sin término o vacía retorne HTTP 400.
func TestBuscarHandler_QueryVacia_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodGet, "/api/search?q=", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Esperado 400 Bad Request para query vacía, obtenido %d", w.Code)
	}
}

// TestBuscarHandler_InyeccionGROQ_Retorna400 verifica que metacaracteres de GROQ sean bloqueados con HTTP 400.
// Satisface: RF-18, RNF-04, §9.11.
func TestBuscarHandler_InyeccionGROQ_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	maliciousQueries := []string{
		`*[_type=="categoria"]`,
		`*[tipo=="prod"]`,
		`libro" || 1==1`,
		`libro | order(_createdAt desc)`,
		`{_id, nombre}`,
		`$param`,
	}

	for _, rawQuery := range maliciousQueries {
		target := "/api/search?q=" + url.QueryEscape(rawQuery)
		req := httptest.NewRequest(http.MethodGet, target, nil)
		w := httptest.NewRecorder()

		handler.Handler(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Esperado 400 para query maliciosa %q, obtenido %d", rawQuery, w.Code)
		}
	}
}

// TestBuscarHandler_MetodoPOST_Retorna405 verifica que POST retorne HTTP 405.
func TestBuscarHandler_MetodoPOST_Retorna405(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/search?q=libro", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Esperado 405 Method Not Allowed para POST, obtenido %d", w.Code)
	}
}

// TestBuscarHandler_CORSRechazado_Retorna403 verifica que orígenes no autorizados retornen 403.
func TestBuscarHandler_CORSRechazado_Retorna403(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.com")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=libro", nil)
	req.Header.Set("Origin", "https://sitio-desconocido.com")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("Esperado 403 para origen no permitido, obtenido %d", w.Code)
	}
}

// TestBuscarHandler_RateLimitExcedido_Retorna429 verifica que exceder límite retorne 429.
func TestBuscarHandler_RateLimitExcedido_Retorna429(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockSearcher{}
	handler.SetSanitySearcher(mock)

	for i := 1; i <= 10; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/search?q=libro", nil)
		req.RemoteAddr = "10.0.0.88:1234"
		w := httptest.NewRecorder()
		handler.Handler(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("Petición %d de búsqueda debió ser 200, obtenido %d", i, w.Code)
		}
	}

	req11 := httptest.NewRequest(http.MethodGet, "/api/search?q=libro", nil)
	req11.RemoteAddr = "10.0.0.88:1234"
	w11 := httptest.NewRecorder()
	handler.Handler(w11, req11)
	if w11.Code != http.StatusTooManyRequests {
		t.Errorf("11ª petición debió retornar 429 Too Many Requests, obtenido %d", w11.Code)
	}
}

// TestBuscarHandler_SanityError_Retorna500 verifica que ante fallo de Sanity se responda 500 genérico.
func TestBuscarHandler_SanityError_Retorna500(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockSearcher{
		searchProductsFunc: func(ctx context.Context, query string) ([]map[string]interface{}, error) {
			return nil, errors.New("sanity query network failure")
		},
	}
	handler.SetSanitySearcher(mock)

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=libro", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Esperado 500 para error de Sanity, obtenido %d", w.Code)
	}
}

// TestBuscarHandler_AliasEspanol_Retorna200 verifica la función BuscarHandler.
func TestBuscarHandler_AliasEspanol_Retorna200(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockSearcher{}
	handler.SetSanitySearcher(mock)

	req := httptest.NewRequest(http.MethodGet, "/api/buscar?q=cuento", nil)
	w := httptest.NewRecorder()

	handler.BuscarHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Esperado 200 OK para alias en español, obtenido %d", w.Code)
	}
}

// TestBuscarHandler_PanicRecuperado_Retorna500 verifica que un panic sea capturado.
func TestBuscarHandler_PanicRecuperado_Retorna500(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockSearcher{
		searchProductsFunc: func(ctx context.Context, query string) ([]map[string]interface{}, error) {
			panic("panic in search")
		},
	}
	handler.SetSanitySearcher(mock)

	req := httptest.NewRequest(http.MethodGet, "/api/search?q=libro", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Esperado 500 para panic, obtenido %d", w.Code)
	}
}
