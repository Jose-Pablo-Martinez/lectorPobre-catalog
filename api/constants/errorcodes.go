// Package constants centralizes LectorPobre error codes shared across all handlers.
// The same values must be mirrored in the frontend at types/api.ts → ErrorCode.
// TODO: Expand with additional codes as new handlers are implemented in Phase 5.
package constants

// ErrCodes contains all canonical API error codes returned by the Go serverless functions.
// Client-facing error messages must reference these codes, never internal details (§9.9).
var ErrCodes = struct {
	PayloadInvalido   string
	RateLimit         string
	NoAutorizado      string
	ErrorInterno      string
	CalificacionRango string
	QueryInvalida     string
	FirmaInvalida     string
}{
	PayloadInvalido:   "PAYLOAD_INVALIDO",
	RateLimit:         "RATE_LIMIT_EXCEDIDO",
	NoAutorizado:      "NO_AUTORIZADO",
	ErrorInterno:      "ERROR_INTERNO",
	CalificacionRango: "CALIFICACION_FUERA_DE_RANGO",
	QueryInvalida:     "QUERY_INVALIDA",
	FirmaInvalida:     "FIRMA_INVALIDA",
}
