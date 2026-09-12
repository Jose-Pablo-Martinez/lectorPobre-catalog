// Package sanity implements the Sanity.io write client for LectorPobre Go functions.
// The write token is read exclusively from the SANITY_WRITE_TOKEN environment variable.
// NEVER expose this token in logs, HTTP responses, or source code (RNF-04, §8).
// TODO(Phase 5): Implement full Sanity write client with Writer interface. Issue #14.
// Satisfies: RF-06, RF-07 (write path), RNF-04 (token isolation).
package sanity

import "context"

// Writer defines the interface for all Sanity write operations used by LectorPobre handlers.
// Using an interface allows unit tests (UT-GO-11 to UT-GO-18) to inject a mock implementation
// without touching the real Sanity API, keeping those tests Fast and Isolated (FIRST principle).
// Tested by: IT-01 to IT-07 with real Sanity staging dataset (VyV_LectorPobre.md §4.1).
type Writer interface {
	// CrearComentario writes a new comment document in "pending" state to Sanity.
	// Satisfies: RF-07 (Comments with pre-moderation).
	CrearComentario(ctx context.Context, productoID string, texto string) error

	// CrearCalificacion writes a new rating document to Sanity.
	// Satisfies: RF-06 (Ratings, range 1-5).
	CrearCalificacion(ctx context.Context, productoID string, valor int) error
}

// Client is the production implementation of Writer that calls the real Sanity Mutations API.
// TODO(Phase 5): Implement with net/http, read SANITY_WRITE_TOKEN from env, handle errors.
type Client struct {
	// TODO: Add projectID, dataset, token fields.
}

// NewClient creates a new Sanity Client reading credentials from environment variables.
// Returns an error if required environment variables are missing.
func NewClient() (*Client, error) {
	// TODO(Phase 5): Read SANITY_WRITE_TOKEN, NUXT_PUBLIC_SANITY_PROJECT_ID,
	// NUXT_PUBLIC_SANITY_DATASET from os.Getenv. Return error if any are empty.
	return &Client{}, nil
}

// CrearComentario implements Writer.CrearComentario.
func (c *Client) CrearComentario(ctx context.Context, productoID string, texto string) error {
	// TODO(RF-07, Phase 5): Build Sanity mutation payload, POST to mutations API,
	// handle non-2xx responses generically (never expose Sanity status codes to callers).
	return nil
}

// CrearCalificacion implements Writer.CrearCalificacion.
func (c *Client) CrearCalificacion(ctx context.Context, productoID string, valor int) error {
	// TODO(RF-06, Phase 5): Build Sanity mutation payload, POST to mutations API.
	return nil
}
