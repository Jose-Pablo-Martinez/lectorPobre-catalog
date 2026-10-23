// Package handlers define los tipos de carga útil compartidos por todos los handlers serverless de LectorPobre.
// Estos tipos constituyen la única fuente de verdad para los contratos de la API.
// Los tipos de TypeScript correspondientes residen en types/api.ts (frontend).
// TODO(Fase 5): Agregar etiquetas o funciones de validación a nivel de campo por cada payload.
package handlers

// CommentPayload representa el cuerpo JSON esperado para POST /api/comment.
// Satisface: RF-07 (Comentarios).
type CommentPayload struct {
	// ProductID es el _id del documento de Sanity del producto que se comenta.
	ProductID string `json:"productId"`
	// Text es el cuerpo del comentario. Máximo 1000 caracteres (validado en validation.go).
	Text string `json:"text"`
}

// RatingPayload representa el cuerpo JSON esperado para POST /api/rating.
// Satisface: RF-06 (Calificaciones). Rango válido: 1–5.
type RatingPayload struct {
	// ProductID es el _id del documento de Sanity del producto calificado.
	ProductID string `json:"productId"`
	// Value es la calificación por estrellas. Debe ser un entero en el rango [1, 5].
	Value int `json:"value"`
}

// SearchQuery contiene los parámetros de búsqueda validados para GET /api/search.
// Satisface: RF-18 (Búsqueda), RNF-04 (Prevención de inyecciones GROQ — §9.11).
type SearchQuery struct {
	// Q es el término de búsqueda sanitizado proporcionado por el usuario.
	Q string `json:"q"`
}
