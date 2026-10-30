package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/tu-org/lectorpobre/pkg/handlers"
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

