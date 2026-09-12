// Package handler implements the serverless function for product ratings.
package handler

import "net/http"

// TODO(RF-06): Implement range validation (1-5), rate limiting and Sanity write. Issue #6.

// Handler processes a new rating submission for a product.
//
// Satisfies: RF-06 (Ratings), RNF-04 (Security).
// Endpoint: POST /api/rating
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
