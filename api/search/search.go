// Package handler implements the serverless function for product search.
package handler

import "net/http"

// TODO(RF-18): Implement GROQ parameterized query and sanitization. Issue #7.
// NOTE: Client-side search in Nuxt (Phase 3) covers most use cases.
// This serverless function activates only if the catalog exceeds hydration thresholds.

// Handler processes the search request.
//
// Satisfies: RF-18 (Search), RNF-04 (GROQ injection prevention).
// Endpoint: GET /api/search
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
