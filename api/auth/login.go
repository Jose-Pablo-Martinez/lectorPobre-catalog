// Package handler implements the admin login serverless function.
// TODO(RF-08): Implement bcrypt password validation and JWT signing. Issue #8.
// Satisfies: RF-08 (Admin Login), RNF-04 (No credential exposure in responses).
package handler

import "net/http"

// Handler is the Vercel serverless function entry point for POST /api/auth/login.
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
