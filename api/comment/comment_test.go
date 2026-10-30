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

	handler "github.com/tu-org/lectorpobre/api/comment"
	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/middleware"
)

// mockSanityWriter implementa sanity.Writer para pruebas unitarias.
type mockSanityWriter struct {
	createCommentFunc func(ctx context.Context, productID string, text string) error
	createRatingFunc  func(ctx context.Context, productID string, value int) error
}

func (m *mockSanityWriter) CreateComment(ctx context.Context, productID string, text string) error {
	if m.createCommentFunc != nil {
		return m.createCommentFunc(ctx, productID, text)
	}
	return nil
}

func (m *mockSanityWriter) CreateRating(ctx context.Context, productID string, value int) error {
	if m.createRatingFunc != nil {
		return m.createRatingFunc(ctx, productID, value)
	}
	return nil
}

// UT-GO-11: TestComentarHandler_PayloadJSON_Retorna201 verifica el flujo exitoso de publicación de comentario.
// Satisface: RF-07, VyV §3.2.
func TestComentarHandler_PayloadJSON_Retorna201(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	var capturedProductID, capturedText string
	mock := &mockSanityWriter{
		createCommentFunc: func(ctx context.Context, productID string, text string) error {
			capturedProductID = productID
			capturedText = text
			return nil
		},
	}
	handler.SetSanityWriter(mock)

	payload := `{"productId":"prod-xyz-123","text":"Excelente libro, me encantó la historia."}`
	req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Código esperado 201 Created, obtenido %d. Body: %s", w.Code, w.Body.String())
	}

	var resp handlers.ApiResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Error al deserializar respuesta JSON: %v", err)
	}
	if !resp.Ok {
		t.Errorf("Se esperaba resp.Ok == true, obtenido false")
	}

	if capturedProductID != "prod-xyz-123" || capturedText != "Excelente libro, me encantó la historia." {
		t.Errorf("Datos enviados a Sanity no coinciden con el payload: pid=%s text=%s", capturedProductID, capturedText)
	}
}

// TestComentarHandler_CamposEspanol_Retorna201 verifica soporte para payloads con campos en español (productoId, texto).
// Satisface: RF-07, DEVELOPMENT_GUIDELINES.md §3.2.
func TestComentarHandler_CamposEspanol_Retorna201(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockSanityWriter{}
	handler.SetSanityWriter(mock)

	payload := `{"productoId":"prod-456","texto":"Muy buena calidad."}`
	req := httptest.NewRequest(http.MethodPost, "/api/comentar", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Esperado 201 Created para payload en español, obtenido %d", w.Code)
	}
}

// UT-GO-12: TestComentarHandler_PayloadMalformado_Retorna400 verifica que un JSON roto retorne HTTP 400.
// Satisface: RF-07, RNF-04, VyV §3.2.
func TestComentarHandler_PayloadMalformado_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	handler.SetSanityWriter(&mockSanityWriter{})

	brokenPayload := `{"productId":"abc", text: sin comillas`
	req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(brokenPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Código esperado 400 Bad Request para JSON malformado, obtenido %d", w.Code)
	}

	var resp handlers.ApiResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Ok {
		t.Errorf("resp.Ok debió ser false para payload malformado")
	}
}

// UT-GO-13: TestComentarHandler_MetodoGET_Retorna405 verifica que solicitudes no POST retornen HTTP 405.
// Satisface: RF-07, VyV §3.2.
func TestComentarHandler_MetodoGET_Retorna405(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/comment", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Código esperado 405 Method Not Allowed para GET, obtenido %d", w.Code)
	}
}

// UT-GO-14: TestComentarHandler_SinContentType_Retorna400 verifica que peticiones sin Content-Type: application/json retornen HTTP 400.
// Satisface: RF-07, VyV §3.2.
func TestComentarHandler_SinContentType_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	handler.SetSanityWriter(&mockSanityWriter{})

	payload := `{"productId":"prod-1","text":"Buen producto"}`
	req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(payload))
	// Sin encabezado Content-Type
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Código esperado 400 Bad Request cuando falta Content-Type, obtenido %d", w.Code)
	}
}

// UT-GO-18: TestRespuestaError_NuncaExponeTrazas verifica que ningún error interno exponga stack traces o pánicos.
// Satisface: RNF-04, VyV §3.2.
func TestRespuestaError_NuncaExponeTrazas(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	// Mock que simula un fallo interno en Sanity
	mock := &mockSanityWriter{
		createCommentFunc: func(ctx context.Context, productID string, text string) error {
			return errors.New("sanity network connection refused at internal/net/dial.go:123")
		},
	}
	handler.SetSanityWriter(mock)

	payload := `{"productId":"prod-1","text":"Hola"}`
	req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Código esperado 500, obtenido %d", w.Code)
	}

	body := w.Body.String()
	bannedTerms := []string{"goroutine", "panic", "dial.go", "Sanity API", "internal/net"}
	for _, term := range bannedTerms {
		if strings.Contains(strings.ToLower(body), strings.ToLower(term)) {
			t.Errorf("ALERTA DE SEGURIDAD (UT-GO-18): El cuerpo expone detalles internos: contiene %q en %s", term, body)
		}
	}
}

// TestComentarHandler_ValidacionFallida_Retorna400 valida que textos vacíos o excediendo 1000 caracteres retornen HTTP 400.
func TestComentarHandler_ValidacionFallida_Retorna400(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	handler.SetSanityWriter(&mockSanityWriter{})

	casos := []string{
		`{"productId":"","text":"Texto válido"}`,
		`{"productId":"p1","text":""}`,
		`{"productId":"p1","text":"` + strings.Repeat("x", 1001) + `"}`,
	}

	for _, payload := range casos {
		req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.Handler(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("Esperado 400 para payload inválido, obtenido %d", w.Code)
		}
	}
}

// TestComentarHandler_CORSRechazado_Retorna403 verifica que orígenes no autorizados sean bloqueados.
func TestComentarHandler_CORSRechazado_Retorna403(t *testing.T) {
	os.Setenv("ALLOWED_ORIGIN", "https://lectorpobre.com")
	defer os.Unsetenv("ALLOWED_ORIGIN")

	req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(`{}`))
	req.Header.Set("Origin", "https://sitio-malicioso.com")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("Esperado 403 Forbidden para origen CORS desconocido, obtenido %d", w.Code)
	}
}

// TestComentarHandler_RateLimitExcedido_Retorna429 verifica que exceder 10 peticiones retorne 429.
func TestComentarHandler_RateLimitExcedido_Retorna429(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	handler.SetSanityWriter(&mockSanityWriter{})

	payload := `{"productId":"p1","text":"Un comentario"}`

	// 10 peticiones válidas permitidas
	for i := 1; i <= 10; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "10.20.30.40:9999"
		w := httptest.NewRecorder()

		handler.Handler(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("Petición %d de 10 debió retornar 201, obtenido %d", i, w.Code)
		}
	}

	// 11ª petición rechazada por rate limit
	req11 := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(payload))
	req11.Header.Set("Content-Type", "application/json")
	req11.RemoteAddr = "10.20.30.40:9999"
	w11 := httptest.NewRecorder()

	handler.Handler(w11, req11)
	if w11.Code != http.StatusTooManyRequests {
		t.Errorf("11ª petición debió retornar 429 Too Many Requests, obtenido %d", w11.Code)
	}
}

// TestComentarHandler_PanicRecuperado_Retorna500 verifica que un pánico provocado sea recuperado y no exponga trazas.
func TestComentarHandler_PanicRecuperado_Retorna500(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	mock := &mockSanityWriter{
		createCommentFunc: func(ctx context.Context, productID string, text string) error {
			panic("simulated fatal panic inside writer")
		},
	}
	handler.SetSanityWriter(mock)

	payload := `{"productId":"p1","text":"Comentario"}`
	req := httptest.NewRequest(http.MethodPost, "/api/comment", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("Esperado 500 para panic recuperado, obtenido %d", w.Code)
	}

	if strings.Contains(w.Body.String(), "simulated fatal panic") {
		t.Errorf("La respuesta expuso el texto del pánico: %s", w.Body.String())
	}
}

