// Package handler implements the Sanity webhook rebuild serverless function.
package handler

import (
	"io"
	"log"
	"net/http"
	"os"

	"github.com/tu-org/lectorpobre/internal/middleware"
)

// Handler verifies the HMAC signature and triggers a Vercel deploy hook rebuild.
//
// Satisfies: Architecture §9.10 (Webhook with HMAC), RNF-04, implementationPlan §4.2.
// Tested by: IT-12 (valid HMAC), IT-13 (invalid HMAC), IT-14 (missing signature) — VyV §4.4.
// Endpoint: POST /api/webhook/rebuild
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		w.Write([]byte(`{"error":"método no permitido"}`))
		return
	}

	payload, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"error interno"}`))
		return
	}
	defer r.Body.Close()

	secret := os.Getenv("SANITY_WEBHOOK_SECRET")
	firma := r.Header.Get("Sanity-Webhook-Signature")

	// Verificar firma HMAC-SHA256 de Sanity (RNF-04, §9.10)
	if !middleware.VerifyHMAC(payload, firma, secret) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error":"firma inválida"}`))
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
	w.Write([]byte(`{"ok":true}`))
}

