// Package handler implements the Sanity webhook rebuild serverless function.
package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/tu-org/lectorpobre/pkg/middleware"
)

const defaultRebuildCooldown = 5 * time.Minute

var (
	cooldownMu    sync.Mutex
	lastRebuildAt time.Time
	nowFunc       = time.Now
)

// ResetRebuildCooldown reinicia el estado del cooldown de rebuild (para pruebas unitarias).
func ResetRebuildCooldown() {
	cooldownMu.Lock()
	defer cooldownMu.Unlock()
	lastRebuildAt = time.Time{}
	nowFunc = time.Now
}

// SetRebuildClock permite inyectar un reloj determinista durante las pruebas unitarias.
func SetRebuildClock(fn func() time.Time) {
	cooldownMu.Lock()
	defer cooldownMu.Unlock()
	if fn == nil {
		nowFunc = time.Now
		return
	}
	nowFunc = fn
}

func shouldSkipRebuild(payload []byte) bool {
	var doc struct {
		Type           string `json:"_type"`
		Estado         string `json:"estado"`
		PreviousEstado string `json:"previousEstado"`
	}
	if err := json.Unmarshal(payload, &doc); err != nil || doc.Type == "" {
		return false
	}
	if doc.Type == "comentario" && doc.Estado == "pendiente" && doc.PreviousEstado != "aprobado" {
		return true
	}
	return doc.Type != "producto" &&
		doc.Type != "categoria" &&
		doc.Type != "configuracionGlobal" &&
		doc.Type != "comentario" &&
		doc.Type != "calificacion"
}

func tryAcquireRebuildSlot() bool {
	cooldownMu.Lock()
	defer cooldownMu.Unlock()
	now := nowFunc()
	if !lastRebuildAt.IsZero() && now.Sub(lastRebuildAt) < defaultRebuildCooldown {
		return false
	}
	lastRebuildAt = now
	return true
}

// Handler verifies the HMAC signature and triggers a Vercel deploy hook rebuild.
//
// Satisfies: Architecture §9.10 (Webhook with HMAC), RNF-04, implementationPlan §4.2.
// Tested by: IT-12 (valid HMAC), IT-13 (invalid HMAC), IT-14 (missing signature) — VyV §4.4.
// Endpoint: POST /api/webhook/rebuild
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_, _ = w.Write([]byte(`{"error":"método no permitido"}`))
		return
	}

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"error interno"}`))
		return
	}
	defer r.Body.Close()

	secret := os.Getenv("SANITY_WEBHOOK_SECRET")
	firma := r.Header.Get("Sanity-Webhook-Signature")

	// Verificar firma HMAC-SHA256 de Sanity (RNF-04, §9.10)
	if !middleware.VerifyHMAC(payload, firma, secret) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"firma inválida"}`))
		return
	}

	// Filtrar tipos de documento que no requieren rebuild público y aplicar cooldown (V-04)
	if shouldSkipRebuild(payload) || !tryAcquireRebuildSlot() {
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{"ok":true,"skipped":true}`))
		return
	}

	// Disparar rebuild en Vercel via Vercel Deploy Hook
	deployHookURL := os.Getenv("VERCEL_DEPLOY_HOOK_URL")
	if deployHookURL != "" {
		resp, err := http.Post(deployHookURL, "application/json", nil)
		if err != nil {
			log.Printf("[WARN] RebuildHandler: error al llamar Vercel Deploy Hook: %v", err)
		} else {
			defer resp.Body.Close()
		}
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

