package handler_test

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"

	handler "github.com/tu-org/lectorpobre/api/webhook"
)

// IT-12: POST /api/webhook/rebuild con firma HMAC válida retorna 200 y dispara el deploy hook.
// Satisface: Arquitectura §9.10, RNF-04, VyV §4.4.
func TestRebuildHandler_FirmaValida_Retorna200YDisparaHook(t *testing.T) {
	secret := "test-sanity-secret-12345"
	os.Setenv("SANITY_WEBHOOK_SECRET", secret)
	defer os.Unsetenv("SANITY_WEBHOOK_SECRET")

	var deployHookCalled int32
	mockVercel := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			atomic.AddInt32(&deployHookCalled, 1)
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer mockVercel.Close()

	os.Setenv("VERCEL_DEPLOY_HOOK_URL", mockVercel.URL)
	defer os.Unsetenv("VERCEL_DEPLOY_HOOK_URL")

	payload := `{"operation":"create","documentId":"drafts.producto-1"}`
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	signature := hex.EncodeToString(mac.Sum(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/webhook/rebuild", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Sanity-Webhook-Signature", signature)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Esperado status 200, obtenido %d. Body: %s", w.Code, w.Body.String())
	}

	if atomic.LoadInt32(&deployHookCalled) != 1 {
		t.Errorf("Esperado 1 disparo a VERCEL_DEPLOY_HOOK_URL, obtenido %d", deployHookCalled)
	}
}

// IT-13: POST /api/webhook/rebuild con firma HMAC inválida retorna 401 y no dispara el hook.
// Satisface: Arquitectura §9.10, RNF-04, VyV §4.4.
func TestRebuildHandler_FirmaInvalida_Retorna401(t *testing.T) {
	secret := "test-sanity-secret-12345"
	os.Setenv("SANITY_WEBHOOK_SECRET", secret)
	defer os.Unsetenv("SANITY_WEBHOOK_SECRET")

	var deployHookCalled int32
	mockVercel := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&deployHookCalled, 1)
	}))
	defer mockVercel.Close()
	os.Setenv("VERCEL_DEPLOY_HOOK_URL", mockVercel.URL)
	defer os.Unsetenv("VERCEL_DEPLOY_HOOK_URL")

	payload := `{"operation":"delete","documentId":"producto-1"}`
	req := httptest.NewRequest(http.MethodPost, "/api/webhook/rebuild", strings.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Sanity-Webhook-Signature", "firma-falsa-invalida")
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("Esperado status 401 para firma inválida, obtenido %d", w.Code)
	}

	if atomic.LoadInt32(&deployHookCalled) != 0 {
		t.Errorf("El hook no debió ser llamado con firma inválida")
	}
}

// IT-14: POST /api/webhook/rebuild sin firma retorna 401.
// Satisface: Arquitectura §9.10, RNF-04, VyV §4.4.
func TestRebuildHandler_SinFirma_Retorna401(t *testing.T) {
	os.Setenv("SANITY_WEBHOOK_SECRET", "secreto-12345")
	defer os.Unsetenv("SANITY_WEBHOOK_SECRET")

	req := httptest.NewRequest(http.MethodPost, "/api/webhook/rebuild", strings.NewReader(`{}`))
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("Esperado status 401 sin cabecera de firma, obtenido %d", w.Code)
	}
}

// TestRebuildHandler_MetodoNoPermitido_Retorna405 verifica que peticiones GET sean rechazadas.
func TestRebuildHandler_MetodoNoPermitido_Retorna405(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/webhook/rebuild", nil)
	w := httptest.NewRecorder()

	handler.Handler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("Esperado status 405 para método GET, obtenido %d", w.Code)
	}
}
