// Package handlers define los tipos de carga útil compartidos por todos los handlers serverless de LectorPobre.
// Estos tipos constituyen la única fuente de verdad para los contratos de la API.
// Los tipos de TypeScript correspondientes residen en types/api.ts (frontend).
// Satisface: RF-06 (Calificaciones), RF-07 (Comentarios), RF-18 (Búsqueda), RNF-04 (Contratos tipados).
package handlers

import "encoding/json"

// CommentPayload representa el cuerpo JSON esperado para POST /api/comment (y /api/comentar).
// Satisface: RF-07 (Comentarios).
type CommentPayload struct {
	// ProductID es el _id del documento de Sanity del producto que se comenta.
	ProductID string `json:"productId"`
	// Text es el cuerpo del comentario. Máximo 1000 caracteres (validado en validation.go).
	Text string `json:"text"`
}

// ComentarioPayload es un alias para CommentPayload en español para compatibilidad con las especificaciones de arquitectura.
type ComentarioPayload = CommentPayload

// UnmarshalJSON permite deserializar tanto nombres de campo en inglés (productId, text)
// como en español (productoId, texto) para máxima compatibilidad con frontend y pruebas.
func (c *CommentPayload) UnmarshalJSON(data []byte) error {
	type Alias CommentPayload
	aux := struct {
		*Alias
		ProductoID string `json:"productoId"`
		Texto      string `json:"texto"`
	}{
		Alias: (*Alias)(c),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	if c.ProductID == "" && aux.ProductoID != "" {
		c.ProductID = aux.ProductoID
	}
	if c.Text == "" && aux.Texto != "" {
		c.Text = aux.Texto
	}
	return nil
}

// RatingPayload representa el cuerpo JSON esperado para POST /api/rating (y /api/calificar).
// Satisface: RF-06 (Calificaciones). Rango válido: 1–5.
type RatingPayload struct {
	// ProductID es el _id del documento de Sanity del producto calificado.
	ProductID string `json:"productId"`
	// Value es la calificación por estrellas. Debe ser un entero en el rango [1, 5].
	Value int `json:"value"`
}

// CalificacionPayload es un alias para RatingPayload en español para compatibilidad.
type CalificacionPayload = RatingPayload

// UnmarshalJSON permite deserializar nombres de campo en inglés (productId, value)
// y en español (productoId, valor).
func (r *RatingPayload) UnmarshalJSON(data []byte) error {
	type Alias RatingPayload
	aux := struct {
		*Alias
		ProductoID string `json:"productoId"`
		Valor      int    `json:"valor"`
	}{
		Alias: (*Alias)(r),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	if r.ProductID == "" && aux.ProductoID != "" {
		r.ProductID = aux.ProductoID
	}
	if r.Value == 0 && aux.Valor != 0 {
		r.Value = aux.Valor
	}
	return nil
}

// SearchQuery contiene los parámetros de búsqueda validados para GET /api/search.
// Satisface: RF-18 (Búsqueda), RNF-04 (Prevención de inyecciones GROQ — §9.11).
type SearchQuery struct {
	// Q es el término de búsqueda sanitizado proporcionado por el usuario.
	Q string `json:"q"`
}

// ApiResponse es la estructura de respuesta canónica devuelta por los endpoints serverless de LectorPobre.
// Espeja la interfaz TypeScript ApiResponse definida en types/api.ts.
// Satisface: RNF-04 (Mensajes de error genéricos y respuestas estructuradas).
type ApiResponse struct {
	// Ok indica si la operación fue exitosa.
	Ok bool `json:"ok"`
	// Data contiene datos opcionales devueltos en caso de éxito.
	Data any `json:"data,omitempty"`
	// Error contiene un mensaje genérico amigable para el cliente.
	Error string `json:"error,omitempty"`
	// Code contiene el código de error canónico (definido en constants/errorcodes.go).
	Code string `json:"code,omitempty"`
}
