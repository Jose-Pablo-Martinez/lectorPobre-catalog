// Package middleware implements HTTP security controls for LectorPobre serverless functions.
// Satisfies: RNF-04 (Rate limiting — §9.5).
// TODO(Phase 5): Implement full rate limiting logic. Issue #12.
package middleware

import "net/http"

// RateLimiter holds the in-memory IP-based rate limiting state.
// IMPORTANT: In warm Vercel containers, this map may persist between invocations.
// In cold starts (new container), all counters reset. This is acceptable for this use case.
// For strict limiting, use an external store (e.g. Upstash Redis).
type RateLimiter struct {
	// TODO(Phase 5): Add fields — IP map, mutex, window duration, max requests.
}

// NewRateLimiter creates a new RateLimiter with default settings (10 requests/minute).
func NewRateLimiter() *RateLimiter {
	// TODO(Phase 5): Initialize map and configure window/limit.
	return &RateLimiter{}
}

// Limit checks whether the given request's IP has exceeded the rate limit.
// Returns true if the request is allowed, false (with HTTP 429 written) if it is rejected.
// Tested by: UT-GO-22, UT-GO-23 (VyV_LectorPobre.md §3.3).
func (rl *RateLimiter) Limit(w http.ResponseWriter, r *http.Request) bool {
	// TODO(RNF-04, §9.5): Implement — extract IP, check counter, write 429 if exceeded.
	return true
}
