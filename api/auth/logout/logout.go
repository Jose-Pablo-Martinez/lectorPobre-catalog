// Package handler implements the admin logout serverless function.
// TODO(RF-09): Implement JWT invalidation (short expiry or in-memory denylist). Issue #9.
// Satisfies: RF-09 (Admin Logout), RNF-04 (Stateless token management).
package handler

import "net/http"

// Handler is the Vercel serverless function entry point for POST /api/auth/logout.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
