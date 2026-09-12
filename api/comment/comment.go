// Package handler implements the serverless function for product comments.
package handler

import "net/http"

// TODO(RF-07): Implement full validation, rate limiting, HMAC and Sanity write. Issue #5.

// Handler processes a new comment submission for a product.
//
// Satisfies: RF-07 (Comments), RNF-04 (Security — no token exposure).
// Endpoint: POST /api/comment
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
