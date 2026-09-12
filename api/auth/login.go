// Package handler implements the admin login serverless function.
package handler

import "net/http"

// TODO(RF-08): Implement bcrypt password validation and JWT signing. Issue #8.

// Handler processes the admin login request.
//
// Satisfies: RF-08 (Admin Login), RNF-04 (No credential exposure in responses).
//
// @Summary      Admin login
// @Description  Validates admin credentials using bcrypt and issues a short-lived JWT.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Success      200  {object}  interface{}
// @Failure      400  {object}  interface{}  "Invalid payload"
// @Failure      401  {object}  interface{}  "Invalid credentials"
// @Failure      500  {object}  interface{}  "Internal error (no internal detail exposed)"
// @Router       /api/auth/login [post]
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
