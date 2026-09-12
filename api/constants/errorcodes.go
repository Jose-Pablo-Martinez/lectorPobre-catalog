// Package constants centralizes LectorPobre error codes shared across all handlers.
// The same values must be mirrored in the frontend at types/api.ts → ErrorCode.
// TODO: Expand with additional codes as new handlers are implemented in Phase 5.
package constants

// ErrCodes contains all canonical API error codes returned by the Go serverless functions.
// Client-facing error messages must reference these codes, never internal details (§9.9).
var ErrCodes = struct {
	InvalidPayload   string
	RateLimit        string
	Unauthorized     string
	InternalError    string
	RatingOutOfRange string
	InvalidQuery     string
	InvalidSignature string
}{
	InvalidPayload:   "INVALID_PAYLOAD",
	RateLimit:        "RATE_LIMIT_EXCEEDED",
	Unauthorized:     "UNAUTHORIZED",
	InternalError:    "INTERNAL_ERROR",
	RatingOutOfRange: "RATING_OUT_OF_RANGE",
	InvalidQuery:     "INVALID_QUERY",
	InvalidSignature: "INVALID_SIGNATURE",
}
