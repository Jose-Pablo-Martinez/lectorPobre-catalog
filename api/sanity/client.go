// Package sanity implementa el cliente de escritura de Sanity.io para las funciones Go de LectorPobre.
// El token de escritura se lee exclusivamente de la variable de entorno SANITY_WRITE_TOKEN.
// NUNCA exponer este token en logs, respuestas HTTP ni código fuente (RNF-04, §8).
// TODO(Fase 5): Implementar el cliente completo de escritura en Sanity con la interfaz Writer. Issue #14.
// Satisface: RF-06, RF-07 (ruta de escritura), RNF-04 (aislamiento de tokens).
package sanity

import "context"

// Writer define la interfaz para todas las operaciones de escritura en Sanity utilizadas por los handlers de LectorPobre.
// El uso de una interfaz permite a los tests unitarios (UT-GO-11 a UT-GO-18) inyectar un mock
// sin tocar la API real de Sanity, manteniendo los tests rápidos y aislados (principio FIRST).
// Probado por: IT-01 a IT-07 contra el dataset real de staging de Sanity (VyV_LectorPobre.md §4.1).
type Writer interface {
	// CreateComment escribe un nuevo documento de comentario en estado "pendiente" en Sanity.
	// Satisface: RF-07 (Comentarios con moderación previa).
	CreateComment(ctx context.Context, productID string, text string) error

	// CreateRating escribe un nuevo documento de calificación en Sanity.
	// Satisface: RF-06 (Calificaciones, rango 1-5).
	CreateRating(ctx context.Context, productID string, value int) error
}

// Client es la implementación de producción de Writer que invoca la API Mutations de Sanity.
// TODO(Fase 5): Implementar con net/http, leer SANITY_WRITE_TOKEN de variables de entorno y manejar errores.
type Client struct {
	// TODO: Agregar campos projectID, dataset, token.
}

// NewClient crea una nueva instancia de Client leyendo credenciales desde las variables de entorno.
// Retorna un error si falta alguna de las variables de entorno requeridas.
func NewClient() (*Client, error) {
	// TODO(Fase 5): Leer SANITY_WRITE_TOKEN, NUXT_PUBLIC_SANITY_PROJECT_ID,
	// NUXT_PUBLIC_SANITY_DATASET con os.Getenv. Retornar error si alguno está vacío.
	return &Client{}, nil
}

// CreateComment implementa Writer.CreateComment.
func (c *Client) CreateComment(ctx context.Context, productID string, text string) error {
	// TODO(RF-07, Fase 5): Construir payload de mutación de Sanity, hacer POST a la API de mutations,
	// manejar respuestas distintas de 2xx de forma genérica (nunca exponer códigos de estado internos de Sanity al cliente).
	return nil
}

// CreateRating implementa Writer.CreateRating.
func (c *Client) CreateRating(ctx context.Context, productID string, value int) error {
	// TODO(RF-06, Fase 5): Construir payload de mutación de Sanity y hacer POST a la API de mutations.
	return nil
}
