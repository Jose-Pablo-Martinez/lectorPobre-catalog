// Package handler implements the Sanity webhook rebuild serverless function.
// TODO(Phase 5): Implement HMAC verification and Vercel Deploy Hook call. Issue #15.
// Satisfies: Architecture §9.10 (Webhook with HMAC), RNF-04.
package handler

import "net/http"

// Handler is the Vercel serverless function entry point for POST /api/webhook/rebuild.
// It verifies the HMAC signature from Sanity and triggers a Vercel deploy hook rebuild.
// Tested by: IT-12 (valid HMAC), IT-13 (invalid HMAC), IT-14 (missing signature) — VyV §4.3.
func Handler(w http.ResponseWriter, r *http.Request) {
	// TODO(Phase 5): Read body, verify HMAC with middleware.VerificarHMAC,
	// return 401 on failure, POST to VERCEL_DEPLOY_HOOK_URL on success.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
