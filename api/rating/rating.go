// Package handler implements the serverless function for product ratings.
package handler

import "net/http"

// TODO(RF-06): Implement range validation (1-5), rate limiting and Sanity write. Issue #6.

// Handler processes a new rating submission for a product.
//
// Satisfies: RF-06 (Ratings), RNF-04 (Security).
//
// @Summary      Submit a product rating
// @Description  Validates the rating payload (1-5), applies rate limiting and writes to Sanity.io.
// @Tags         ratings
// @Accept       json
// @Produce      json
// @Success      201  {object}  interface{}
// @Failure      400  {object}  interface{}  "Invalid payload or rating out of range"
// @Failure      429  {object}  interface{}  "Rate limit exceeded"
// @Failure      500  {object}  interface{}  "Internal error (no internal detail exposed)"
// @Router       /api/rating [post]
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
