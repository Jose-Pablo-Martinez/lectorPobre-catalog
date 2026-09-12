// Package handler implements the Sanity webhook rebuild serverless function.
package handler

import "net/http"

// TODO(Phase 5): Implement HMAC verification and Vercel Deploy Hook call. Issue #15.

// Handler verifies the HMAC signature and triggers a Vercel deploy hook rebuild.
//
// Satisfies: Architecture 9.10 (Webhook with HMAC), RNF-04.
// Tested by: IT-12 (valid HMAC), IT-13 (invalid HMAC), IT-14 (missing signature) - VyV 4.3.
//
// @Summary      Webhook rebuild
// @Description  Verifies HMAC from Sanity and triggers a Vercel Deploy Hook.
// @Tags         webhooks
// @Accept       json
// @Produce      json
// @Success      200  {object}  interface{}
// @Failure      401  {object}  interface{}  "Invalid or missing HMAC signature"
// @Failure      500  {object}  interface{}  "Internal error (no internal detail exposed)"
// @Router       /api/webhook/rebuild [post]
func Handler(w http.ResponseWriter, r *http.Request) {
	// TODO(Phase 5): Read body, verify HMAC with middleware.VerificarHMAC,
	// return 401 on failure, POST to VERCEL_DEPLOY_HOOK_URL on success.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
