// Package handler implementa la función serverless para el registro de calificaciones de productos.
// Satisface: RF-06 (Calificaciones de usuarios de 1 a 5 estrellas),
// RNF-04 (Backend seguro sin estado, rate limiting, CORS y protección de credenciales).
package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/tu-org/lectorpobre/pkg/constants"
	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/sanity"
)

var ratingSanityWriter sanity.Writer

// SetSanityWriter permite inyectar un mock de sanity.Writer durante las pruebas unitarias de calificaciones.
func SetSanityWriter(w sanity.Writer) {
	ratingSanityWriter = w
}

func getRatingWriter() (sanity.Writer, error) {
	if ratingSanityWriter != nil {
		return ratingSanityWriter, nil
	}
	return sanity.NewClient()
}

// Handler procesa la recepción de una nueva calificación para un producto.
// Endpoint: POST /api/rating (y /api/calificar)
//
// Retorna:
//   - 201 Created si la calificación se registró exitosamente en Sanity.
//   - 400 Bad Request si el valor está fuera del rango [1, 5], el productId está vacío o el payload es inválido.
//   - 403 Forbidden si el Origin no está autorizado por CORS.
//   - 405 Method Not Allowed si el método HTTP no es POST.
//   - 429 Too Many Requests si se supera el rate limit por IP (10 req/min).
//   - 500 Internal Server Error si falla la comunicación con Sanity.
func Handler(w http.ResponseWriter, r *http.Request) {
	handlers.ExecuteMutation(w, r, handlers.MutationConfig[handlers.RatingPayload]{
		HandlerName: "RatingHandler",
		ActionName:  "calificar",
		Decode: func(req *http.Request) (handlers.RatingPayload, error) {
			var p handlers.RatingPayload
			err := json.NewDecoder(req.Body).Decode(&p)
			return p, err
		},
		Validate:  handlers.ValidateRating,
		ErrorCode: constants.ErrCodes.RatingOutOfRange,
		Execute: func(ctx context.Context, p handlers.RatingPayload) error {
			writer, err := getRatingWriter()
			if err != nil {
				return err
			}
			return sanity.DispatchRating(ctx, writer, p)
		},
	})
}
