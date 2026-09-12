// Package handler implements the serverless function for product comments.
package handler

import "net/http"

// TODO(RF-07): Implement full validation, rate limiting, HMAC and Sanity write. Issue #5.

// Handler processes a new comment submission for a product.
//
// Satisfies: RF-07 (Comments), RNF-04 (Security — no token exposure).
//
// @Summary      Submit a product comment
// @Description  Validates the comment payload, applies rate limiting and writes to Sanity.io with the private write token.
// @Tags         comments
// @Accept       json
// @Produce      json
// @Success      201   {object}  interface{}
// @Failure      400   {object}  interface{}  "Invalid payload or comment too long"
// @Failure      429   {object}  interface{}  "Rate limit exceeded"
// @Failure      500   {object}  interface{}  "Internal error (no internal detail exposed)"
// @Router       /api/comment [post]
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
