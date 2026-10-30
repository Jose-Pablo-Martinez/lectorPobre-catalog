package handler_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	handler "github.com/tu-org/lectorpobre/api/rating"
	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/middleware"
)

type mockRatingWriter struct {
	createRatingFunc func(ctx context.Context, productID string, value int) error
}

func (m *mockRatingWriter) CreateComment(ctx context.Context, productID string, text string) error {
	return nil
}

func (m *mockRatingWriter) CreateRating(ctx context.Context, productID string, value int) error {
	if m.createRatingFunc != nil {
		return m.createRatingFunc(ctx, productID, value)
	}
	return nil
}

// UT-GO-15: TestCalificarHandler_Valor5_Retorna201 verifica el registro exitoso de una calificación de 5 estrellas.
// Satisface: RF-06, VyV §3.2.
func TestCalificarHandler_Valor5_Retorna201(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	var capturedProductID string
	var capturedValue int

	mock := &mockRatingWriter{
		createRatingFunc: func(ctx context.Context, productID string, value int) error {
			capturedProductID = productID
			capturedValue = value
			return nil
		},
	}
	handler.SetSanityWriter(mock)

	payload := `{"productId":"prod-xyz","value":5}`
	req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Esperado status 201 Created, obtenido %d. Body: %s", w.Code, w.Body.String())
	}

	var resp handlers.ApiResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if !resp.Ok {
		t.Errorf("Se esperaba resp.Ok == true")
	}

	if capturedProductID != "prod-xyz" || capturedValue != 5 {
		t.Errorf("Valores recibidos no coinciden: pid=%s valor=%d", capturedProductID, capturedValue)
	}
}

// UT-GO-16: TestCalificarHandler_ValorFueraRango_Retorna400 verifica que un valor fuera de rango (ej. 7) retorne HTTP 400.
// Satisface: RF-06, VyV §3.2.
func TestCalificarHandler_ValorFueraRango_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	handler.SetSanityWriter(&mockRatingWriter{})

	payload := `{"productId":"prod-xyz","value":7}`
	req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Esperado 400 Bad Request para valor = 7, obtenido %d", w.Code)
	}

	// Probar también valor 0 (frontera inferior)
	payloadZero := `{"productId":"prod-xyz","value":0}`
	reqZero := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payloadZero))
	reqZero.Header.Set("Content-Type", "application/json")
	wZero := httptest.NewRecorder()

	handler.Handler(wZero, reqZero)
	if wZero.Code != http.StatusBadRequest {
		t.Errorf("Esperado 400 Bad Request para valor = 0, obtenido %d", wZero.Code)
	}
}

// TestCalificarHandler_CamposEspanol_Retorna201 verifica soporte para payload en español (productoId, valor).
func TestCalificarHandler_CamposEspanol_Retorna201(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockRatingWriter{}
	handler.SetSanityWriter(mock)

	payload := `{"productoId":"prod-abc","valor":4}`
	req := httptest.NewRequest(http.MethodPost, "/api/calificar", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CalificarHandler(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Esperado 201 Created para payload en español, obtenido %d", w.Code)
	}
}

// TestCalificarHandler_MetodoGET_Retorna405 verifica que GET retorne HTTP 405.
func TestCalificarHandler_MetodoGET_Retorna405(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/rating", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Esperado 405 Method Not Allowed para GET, obtenido %d", w.Code)
	}
}

// TestCalificarHandler_SinContentType_Retorna400 verifica que falte Content-Type retorne 400.
func TestCalificarHandler_SinContentType_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	payload := `{"productId":"prod-xyz","value":5}`
	req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payload))
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Esperado 400 cuando falta Content-Type, obtenido %d", w.Code)
	}
}

// TestCalificarHandler_PayloadMalformado_Retorna400 verifica que JSON roto retorne 400.
func TestCalificarHandler_PayloadMalformado_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(`{invalido`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Esperado 400 para JSON malformado, obtenido %d", w.Code)
	}
}

// TestCalificarHandler_CORSRechazado_Retorna403 verifica que orígenes no autorizados retornen 403.
func TestCalificarHandler_CORSRechazado_Retorna403(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.com")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(`{}`))
	req.Header.Set("Origin", "https://sitio-no-autorizado.com")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("Esperado 403 para origen no permitido, obtenido %d", w.Code)
	}
}

// TestCalificarHandler_RateLimitExcedido_Retorna429 verifica que la 11ª petición retorne 429.
func TestCalificarHandler_RateLimitExcedido_Retorna429(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	handler.SetSanityWriter(&mockRatingWriter{})
	payload := `{"productId":"p1","value":5}`

	for i := 1; i <= 10; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "10.0.0.99:1234"
		w := httptest.NewRecorder()
		handler.Handler(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("Petición %d debió retornar 201, obtenido %d", i, w.Code)
		}
	}

	req11 := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payload))
	req11.Header.Set("Content-Type", "application/json")
	req11.RemoteAddr = "10.0.0.99:1234"
	w11 := httptest.NewRecorder()
	handler.Handler(w11, req11)

	if w11.Code != http.StatusTooManyRequests {
		t.Errorf("11ª petición debió retornar 429 Too Many Requests, obtenido %d", w11.Code)
	}
}

// TestCalificarHandler_SanityError_Retorna500 verifica que ante fallo de Sanity se responda 500 genérico.
func TestCalificarHandler_SanityError_Retorna500(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockRatingWriter{
		createRatingFunc: func(ctx context.Context, productID string, value int) error {
			return errors.New("network failure to sanity")
		},
	}
	handler.SetSanityWriter(mock)

	payload := `{"productId":"p1","value":5}`
	req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Esperado 500 para error de Sanity, obtenido %d", w.Code)
	}
}

// TestCalificarHandler_PanicRecuperado_Retorna500 verifica recuperación ante panic.
func TestCalificarHandler_PanicRecuperado_Retorna500(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockRatingWriter{
		createRatingFunc: func(ctx context.Context, productID string, value int) error {
			panic("panic in rating writer")
		},
	}
	handler.SetSanityWriter(mock)

	payload := `{"productId":"p1","value":5}`
	req := httptest.NewRequest(http.MethodPost, "/api/rating", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Esperado 500 para panic, obtenido %d", w.Code)
	}
}
