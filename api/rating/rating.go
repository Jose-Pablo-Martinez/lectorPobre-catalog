// api/rating.go
// Vercel serverless function entry point for the rating endpoint.
// TODO(RF-06): Implement range validation (1-5), rate limiting and Sanity write. Issue #6.
// Satisfies: RF-06 (Ratings), RNF-04 (Security).
package handler

import "net/http"

// Handler is the Vercel serverless function entry point for POST /api/rating.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
