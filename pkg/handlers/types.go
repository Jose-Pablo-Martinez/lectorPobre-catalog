// Package handlers define los tipos de carga útil compartidos por todos los handlers serverless de LectorPobre.
// Estos tipos constituyen la única fuente de verdad para los contratos de la API.
// Los tipos de TypeScript correspondientes residen en types/api.ts (frontend).
// Satisface: RF-06 (Calificaciones), RF-07 (Comentarios), RF-18 (Búsqueda), RNF-04 (Contratos tipados).
package handlers

import (
	"encoding/json"
	"fmt"
)

func resolveBilingualField[T comparable](primary, alias, zero T, fieldName string) (T, error) {
	if primary != zero && alias != zero && primary != alias {
		return zero, fmt.Errorf("conflicto de campos bilingües en %s", fieldName)
	}
	if primary != zero {
		return primary, nil
	}
	return alias, nil
}

// CommentPayload representa el cuerpo JSON esperado para POST /api/comment (y /api/comentar).
// Satisface: RF-07 (Comentarios).
type CommentPayload struct {
	// ProductID es el _id del documento de Sanity del producto que se comenta.
	ProductID string `json:"productId"`
	// Text es el cuerpo del comentario. Máximo 1000 caracteres (validado en validation.go).
	Text string `json:"text"`
	// Rating es la calificación de 1 a 5 estrellas asociada al comentario (opcional en payloads heredados).
	Rating int `json:"rating,omitempty"`
	// UserID es el identificador anónimo del cliente para garantizar un único comentario activo por producto.
	UserID string `json:"userId,omitempty"`
}

// ComentarioPayload es un alias para CommentPayload en español para compatibilidad con las especificaciones de arquitectura.
type ComentarioPayload = CommentPayload

// UnmarshalJSON permite deserializar tanto nombres de campo en inglés (productId, text, rating, userId)
// como en español (productoId, texto, calificacion, usuarioId), rechazando ambigüedad si ambos
// idiomas se envían simultáneamente con valores distintos (M-5).
func (c *CommentPayload) UnmarshalJSON(data []byte) error {
	type Alias CommentPayload
	aux := struct {
		*Alias
		ProductoID   string `json:"productoId"`
		Texto        string `json:"texto"`
		Calificacion int    `json:"calificacion"`
		UsuarioID    string `json:"usuarioId"`
	}{
		Alias: (*Alias)(c),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	var err error
	if c.ProductID, err = resolveBilingualField(c.ProductID, aux.ProductoID, "", "productId"); err != nil {
		return err
	}
	if c.Text, err = resolveBilingualField(c.Text, aux.Texto, "", "text"); err != nil {
		return err
	}
	if c.Rating, err = resolveBilingualField(c.Rating, aux.Calificacion, 0, "rating"); err != nil {
		return err
	}
	if c.UserID, err = resolveBilingualField(c.UserID, aux.UsuarioID, "", "userId"); err != nil {
		return err
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
	// PreviousValue es la calificación anterior del usuario cuando actualiza su calificación [1, 5].
	PreviousValue int `json:"previousValue,omitempty"`
	// UserID es el identificador anónimo del cliente para garantizar una única calificación activa por producto.
	UserID string `json:"userId,omitempty"`
}

// CalificacionPayload es un alias para RatingPayload en español para compatibilidad.
type CalificacionPayload = RatingPayload

// UnmarshalJSON permite deserializar nombres de campo en inglés (productId, value, previousValue, userId)
// y en español (productoId, valor, valorPrevio, usuarioId), rechazando ambigüedad si ambos
// idiomas se envían simultáneamente con valores distintos (M-5).
func (r *RatingPayload) UnmarshalJSON(data []byte) error {
	type Alias RatingPayload
	aux := struct {
		*Alias
		ProductoID  string `json:"productoId"`
		Valor       int    `json:"valor"`
		ValorPrevio int    `json:"valorPrevio"`
		UsuarioID   string `json:"usuarioId"`
	}{
		Alias: (*Alias)(r),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	var err error
	if r.ProductID, err = resolveBilingualField(r.ProductID, aux.ProductoID, "", "productId"); err != nil {
		return err
	}
	if r.Value, err = resolveBilingualField(r.Value, aux.Valor, 0, "value"); err != nil {
		return err
	}
	if r.PreviousValue, err = resolveBilingualField(r.PreviousValue, aux.ValorPrevio, 0, "previousValue"); err != nil {
		return err
	}
	if r.UserID, err = resolveBilingualField(r.UserID, aux.UsuarioID, "", "userId"); err != nil {
		return err
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
