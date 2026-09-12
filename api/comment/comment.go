// api/comment.go
// Vercel serverless function entry point for the comment endpoint.
// TODO(RF-07): Implement full validation, rate limiting, HMAC and Sanity write. Issue #5.
// Satisfies: RF-07 (Comments), RNF-04 (Security — no token exposure).

package handler

import "net/http"

// Handler is the Vercel serverless function entry point for POST /api/comment.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
