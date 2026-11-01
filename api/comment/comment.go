// Package handler implementa la función serverless para la publicación de comentarios sobre productos.
// Satisface: RF-07 (Comentarios de usuarios con moderación previa en estado pendiente),
// RNF-04 (Backend seguro sin estado, rate limiting, CORS y protección de tokens privados).
package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/sanity"
)

var commentSanityWriter sanity.Writer

// SetSanityWriter permite inyectar un mock de sanity.Writer durante las pruebas unitarias de comentarios.
func SetSanityWriter(w sanity.Writer) {
	commentSanityWriter = w
}

func getCommentWriter() (sanity.Writer, error) {
	if commentSanityWriter != nil {
		return commentSanityWriter, nil
	}
	return sanity.NewClient()
}

// Handler procesa la recepción de un comentario para un producto.
// Endpoint: POST /api/comment (y /api/comentar)
//
// Retorna:
//   - 201 Created si el comentario se guardó en Sanity en estado pendiente.
//   - 400 Bad Request si el payload es inválido o falta el encabezado Content-Type.
//   - 403 Forbidden si el Origin no está autorizado por CORS.
//   - 405 Method Not Allowed si el método HTTP no es POST.
//   - 429 Too Many Requests si se supera el rate limit por IP (10 req/min).
//   - 500 Internal Server Error si falla la comunicación con Sanity (mensaje genérico al cliente).
func Handler(w http.ResponseWriter, r *http.Request) {
	handlers.ExecuteMutation(w, r, handlers.MutationConfig[handlers.CommentPayload]{
		HandlerName: "CommentHandler",
		ActionName:  "comentar",
		Decode: func(req *http.Request) (handlers.CommentPayload, error) {
			var p handlers.CommentPayload
			err := json.NewDecoder(req.Body).Decode(&p)
			return p, err
		},
		Validate: handlers.ValidateComment,
		Execute: func(ctx context.Context, p handlers.CommentPayload) error {
			writer, err := getCommentWriter()
			if err != nil {
				return err
			}
			return sanity.DispatchComment(ctx, writer, p)
		},
	})
}
