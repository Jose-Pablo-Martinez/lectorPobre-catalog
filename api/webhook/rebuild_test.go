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
	"time"

	handler "github.com/tu-org/lectorpobre/api/webhook"
)

func signWebhookPayload(payload, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

// IT-12: POST /api/webhook/rebuild con firma HMAC válida retorna 200 y dispara el deploy hook.
// Satisface: Arquitectura §9.10, RNF-04, VyV §4.4.
func TestRebuildHandler_FirmaValida_Retorna200YDisparaHook(t *testing.T) {
	handler.ResetRebuildCooldown()
	secret := "test-sanity-secret-12345" // gitleaks:allow
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
	signature := signWebhookPayload(payload, secret)

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
	secret := "test-sanity-secret-12345" // gitleaks:allow
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

// TestRebuildHandler_CooldownYDocumentosExcluidos verifica que V-04 evite rebuilds repetitivos
// dentro de la ventana de 5 minutos y omita documentos de calificación o comentarios pendientes.
func TestRebuildHandler_CooldownYDocumentosExcluidos(t *testing.T) {
	handler.ResetRebuildCooldown()
	defer handler.ResetRebuildCooldown()

	secret := "test-sanity-secret-v04" // gitleaks:allow
	t.Setenv("SANITY_WEBHOOK_SECRET", secret)

	var deployHookCalled int32
	mockVercel := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&deployHookCalled, 1)
		w.WriteHeader(http.StatusOK)
	}))
	defer mockVercel.Close()
	t.Setenv("VERCEL_DEPLOY_HOOK_URL", mockVercel.URL)

	now := time.Date(2026, 11, 7, 12, 0, 0, 0, time.UTC)
	handler.SetRebuildClock(func() time.Time { return now })

	// 1. Documentos excluidos (comentario nuevo pendiente, otro tipo desconocido) -> 202 Accepted sin llamar hook
	for _, excludedPayload := range []string{
		`{"_type":"comentario","estado":"pendiente"}`,
		`{"_type":"comentario","estado":"pendiente","previousEstado":"pendiente"}`,
		`{"_type":"otroDocumento"}`,
	} {
		req := httptest.NewRequest(http.MethodPost, "/api/webhook/rebuild", strings.NewReader(excludedPayload))
		req.Header.Set("Sanity-Webhook-Signature", signWebhookPayload(excludedPayload, secret))
		w := httptest.NewRecorder()
		handler.Handler(w, req)

		if w.Code != http.StatusAccepted {
			t.Errorf("Esperado 202 Accepted para payload excluido %s, obtenido %d", excludedPayload, w.Code)
		}
	}
	if atomic.LoadInt32(&deployHookCalled) != 0 {
		t.Fatalf("No debió llamarse al deploy hook para documentos excluidos")
	}

	// 2. Primer cambio de producto válido -> 200 OK y dispara hook
	validPayload := `{"_type":"producto","_id":"prod-1"}`
	req1 := httptest.NewRequest(http.MethodPost, "/api/webhook/rebuild", strings.NewReader(validPayload))
	req1.Header.Set("Sanity-Webhook-Signature", signWebhookPayload(validPayload, secret))
	w1 := httptest.NewRecorder()
	handler.Handler(w1, req1)

	if w1.Code != http.StatusOK || atomic.LoadInt32(&deployHookCalled) != 1 {
		t.Fatalf("Primer rebuild válido debía retornar 200 y llamar hook 1 vez (code=%d, calls=%d)", w1.Code, deployHookCalled)
	}

	// 3. Segundo cambio 1 minuto después (dentro del cooldown de 5 min) -> 202 Accepted sin llamar hook
	now = now.Add(1 * time.Minute)
	req2 := httptest.NewRequest(http.MethodPost, "/api/webhook/rebuild", strings.NewReader(validPayload))
	req2.Header.Set("Sanity-Webhook-Signature", signWebhookPayload(validPayload, secret))
	w2 := httptest.NewRecorder()
	handler.Handler(w2, req2)

	if w2.Code != http.StatusAccepted || atomic.LoadInt32(&deployHookCalled) != 1 {
		t.Fatalf("Rebuild dentro del cooldown debía retornar 202 sin disparar hook (code=%d, calls=%d)", w2.Code, deployHookCalled)
	}

	// 4. Tras superar 5 minutos -> 200 OK y vuelve a disparar hook; también probamos SetRebuildClock(nil)
	now = now.Add(5 * time.Minute)
	req3 := httptest.NewRequest(http.MethodPost, "/api/webhook/rebuild", strings.NewReader(validPayload))
	req3.Header.Set("Sanity-Webhook-Signature", signWebhookPayload(validPayload, secret))
	w3 := httptest.NewRecorder()
	handler.Handler(w3, req3)

	if w3.Code != http.StatusOK || atomic.LoadInt32(&deployHookCalled) != 2 {
		t.Fatalf("Rebuild tras expirar cooldown debía retornar 200 y llamar hook (code=%d, calls=%d)", w3.Code, deployHookCalled)
	}
	handler.SetRebuildClock(nil)
}
