package handlers_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/middleware"
)

func TestSendJSON(t *testing.T) {
	w := httptest.NewRecorder()
	handlers.SendJSON(w, http.StatusOK, handlers.ApiResponse{Ok: true})

	if w.Code != http.StatusOK {
		t.Fatalf("esperado 200, obtenido %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"ok":true`) {
		t.Fatalf("cuerpo inesperado: %s", w.Body.String())
	}
}

func TestSendError(t *testing.T) {
	w := httptest.NewRecorder()
	handlers.SendError(w, http.StatusBadRequest, "bad input", "BAD_INPUT")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("esperado 400, obtenido %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"error":"bad input"`) {
		t.Fatalf("cuerpo inesperado: %s", w.Body.String())
	}
}

func TestSendInternalError(t *testing.T) {
	w := httptest.NewRecorder()
	handlers.SendInternalError(w)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("esperado 500, obtenido %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"error":"error interno"`) {
		t.Fatalf("cuerpo inesperado: %s", w.Body.String())
	}
}

func TestSendSuccess(t *testing.T) {
	w := httptest.NewRecorder()
	handlers.SendSuccess(w, http.StatusCreated, "creado")

	if w.Code != http.StatusCreated {
		t.Fatalf("esperado 201, obtenido %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), `"data":"creado"`) {
		t.Fatalf("cuerpo inesperado: %s", w.Body.String())
	}
}

func TestValidateJSONPostRequest(t *testing.T) {
	t.Run("válido", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		valid := handlers.ValidateJSONPostRequest(w, req)
		if !valid {
			t.Fatalf("se esperaba solicitud válida")
		}
	})

	t.Run("método GET rechazado", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		w := httptest.NewRecorder()

		valid := handlers.ValidateJSONPostRequest(w, req)
		if valid {
			t.Fatalf("se esperaba solicitud inválida")
		}
		if w.Code != http.StatusMethodNotAllowed {
			t.Fatalf("esperado 405, obtenido %d", w.Code)
		}
	})

	t.Run("sin Content-Type rechazado", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
		w := httptest.NewRecorder()

		valid := handlers.ValidateJSONPostRequest(w, req)
		if valid {
			t.Fatalf("se esperaba solicitud inválida")
		}
		if w.Code != http.StatusBadRequest {
			t.Fatalf("esperado 400, obtenido %d", w.Code)
		}
	})

	t.Run("origen CORS no permitido", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Origin", "https://untrusted-attacker.com")
		w := httptest.NewRecorder()

		valid := handlers.ValidateJSONPostRequest(w, req)
		if valid {
			t.Fatalf("se esperaba CORS rechazado")
		}
		if w.Code != http.StatusForbidden {
			t.Fatalf("esperado 403, obtenido %d", w.Code)
		}
	})
}

type sampleMutationPayload struct {
	Name string
}

func defaultMutationTestConfig() handlers.MutationConfig[sampleMutationPayload] {
	return handlers.MutationConfig[sampleMutationPayload]{
		HandlerName: "TestHandler",
		ActionName:  "test_action",
		Decode: func(r *http.Request) (sampleMutationPayload, error) {
			return sampleMutationPayload{Name: "ok"}, nil
		},
		Validate: func(p sampleMutationPayload) error {
			if p.Name == "invalid" {
				return errors.New("nombre inválido")
			}
			return nil
		},
		Execute: func(ctx context.Context, p sampleMutationPayload) error {
			if p.Name == "fail" {
				return errors.New("fallo en escritura")
			}
			if p.Name == "panic" {
				panic("simulated panic")
			}
			return nil
		},
	}
}

func TestExecuteMutation_Success(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handlers.ExecuteMutation(w, req, defaultMutationTestConfig())
	if w.Code != http.StatusCreated {
		t.Fatalf("esperado 201, obtenido %d", w.Code)
	}
}

func TestExecuteMutation_DecodeError(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	cfg := defaultMutationTestConfig()
	cfg.Decode = func(r *http.Request) (sampleMutationPayload, error) {
		return sampleMutationPayload{}, errors.New("bad json")
	}

	handlers.ExecuteMutation(w, req, cfg)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("esperado 400, obtenido %d", w.Code)
	}
}

func TestExecuteMutation_ValidationError(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	cfg := defaultMutationTestConfig()
	cfg.Decode = func(r *http.Request) (sampleMutationPayload, error) {
		return sampleMutationPayload{Name: "invalid"}, nil
	}

	handlers.ExecuteMutation(w, req, cfg)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("esperado 400, obtenido %d", w.Code)
	}
}

func TestExecuteMutation_ValidationCustomErrorCode(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	cfg := defaultMutationTestConfig()
	cfg.ErrorCode = "CUSTOM_ERROR"
	cfg.Decode = func(r *http.Request) (sampleMutationPayload, error) {
		return sampleMutationPayload{Name: "invalid"}, nil
	}

	handlers.ExecuteMutation(w, req, cfg)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("esperado 400, obtenido %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "CUSTOM_ERROR") {
		t.Fatalf("esperado CUSTOM_ERROR en respuesta: %s", w.Body.String())
	}
}

func TestExecuteMutation_ExecutionError(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	cfg := defaultMutationTestConfig()
	cfg.Decode = func(r *http.Request) (sampleMutationPayload, error) {
		return sampleMutationPayload{Name: "fail"}, nil
	}

	handlers.ExecuteMutation(w, req, cfg)
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("esperado 500, obtenido %d", w.Code)
	}
}

func TestExecuteMutation_PanicRecovery(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	cfg := defaultMutationTestConfig()
	cfg.Decode = func(r *http.Request) (sampleMutationPayload, error) {
		return sampleMutationPayload{Name: "panic"}, nil
	}

	handlers.ExecuteMutation(w, req, cfg)
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("esperado 500, obtenido %d", w.Code)
	}
}

func TestExecuteMutation_RateLimitExceeded(t *testing.T) {
	middleware.DefaultRateLimiter.Reset()
	cfg := defaultMutationTestConfig()
	cfg.ActionName = "limited_action"

	for i := 1; i <= 10; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "1.2.3.4:1234"
		w := httptest.NewRecorder()
		handlers.ExecuteMutation(w, req, cfg)
		if w.Code != http.StatusCreated {
			t.Fatalf("petición %d debió ser 201, fue %d", i, w.Code)
		}
	}

	// 11th request
	req11 := httptest.NewRequest(http.MethodPost, "/api/test", strings.NewReader(`{}`))
	req11.Header.Set("Content-Type", "application/json")
	req11.RemoteAddr = "1.2.3.4:1234"
	w11 := httptest.NewRecorder()
	handlers.ExecuteMutation(w11, req11, cfg)
	if w11.Code != http.StatusTooManyRequests {
		t.Fatalf("esperado 429, obtenido %d", w11.Code)
	}
}
