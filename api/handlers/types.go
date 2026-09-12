// Package handlers defines the shared payload types used by all LectorPobre serverless handlers.
// These types are the single source of truth for API contracts.
// The corresponding TypeScript types live in types/api.ts (frontend).
// TODO(Phase 5): Add field-level validation tags or validation functions per payload.
package handlers

// ComentarioPayload is the expected JSON body for POST /api/comment.
// Satisfies: RF-07 (Comments).
type ComentarioPayload struct {
	// ProductoID is the Sanity document _id of the product being commented on.
	ProductoID string `json:"productoId"`
	// Texto is the comment body. Max 1000 characters (validated in validation.go).
	Texto string `json:"texto"`
}

// CalificacionPayload is the expected JSON body for POST /api/rating.
// Satisfies: RF-06 (Ratings). Valid range: 1–5.
type CalificacionPayload struct {
	// ProductoID is the Sanity document _id of the product being rated.
	ProductoID string `json:"productoId"`
	// Valor is the star rating. Must be an integer in the range [1, 5].
	Valor int `json:"valor"`
}

// BusquedaQuery holds the validated search parameters for GET /api/search.
// Satisfies: RF-18 (Search), RNF-04 (GROQ injection prevention — §9.11).
type BusquedaQuery struct {
	// Q is the sanitized search term provided by the user.
	Q string `json:"q"`
}
