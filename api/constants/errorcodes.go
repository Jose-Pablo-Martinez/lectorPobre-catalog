// Package constants centraliza los códigos de error de LectorPobre compartidos por todos los handlers.
// Los mismos valores deben reflejarse en el frontend dentro de types/api.ts → ErrorCode.
// TODO: Ampliar con códigos adicionales conforme se implementen nuevos handlers en la Fase 5.
package constants

// ErrCodes contiene todos los códigos canónicos de error devueltos por las funciones serverless de Go.
// Los mensajes de error hacia el cliente deben referenciar estos códigos, nunca detalles internos del sistema (§9.9).
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
