// Package middleware implements HTTP security controls for LectorPobre serverless functions.
// Satisfies: RNF-04 (Secure stateless backend — §9.4 CORS).
// TODO(Phase 5): Implement full CORS logic. Issue #11.
package middleware

import "net/http"

// AplicarCORS configures restrictive CORS headers for Go serverless functions.
// Only allows requests from the origin configured in the ALLOWED_ORIGIN environment variable.
// Returns true if the request should continue processing, false if it was rejected or handled.
// Tested by: UT-GO-19 to UT-GO-21 (VyV_LectorPobre.md §3.3).
func AplicarCORS(w http.ResponseWriter, r *http.Request) bool {
	// TODO(RNF-04, §9.4): Implement — read ALLOWED_ORIGIN, validate Origin header,
	// set Access-Control headers, handle OPTIONS preflight, reject unknown origins with 403.
	return true
}
