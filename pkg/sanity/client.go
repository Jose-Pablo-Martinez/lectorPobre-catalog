// Package sanity implementa el cliente de escritura y consulta de Sanity.io para las funciones Go de LectorPobre.
// El token de escritura se lee exclusivamente de la variable de entorno SANITY_WRITE_TOKEN.
// NUNCA exponer este token en logs, respuestas HTTP ni código fuente (RNF-04, §8).
// Satisface: RF-06 (Calificaciones), RF-07 (Comentarios con pre-moderación), RF-18 (Búsqueda parametrizada), RNF-04 (Aislamiento de secretos).
package sanity

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/tu-org/lectorpobre/pkg/handlers"
)

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

// Searcher define la interfaz para la consulta parametrizada de productos en Sanity (§9.11, RF-18).
type Searcher interface {
	// SearchProducts ejecuta una consulta GROQ tipada y parametrizada para evitar inyecciones.
	SearchProducts(ctx context.Context, query string) ([]map[string]interface{}, error)
}

// Client es la implementación de producción que invoca las APIs Mutations y Query de Sanity.
type Client struct {
	projectID  string
	dataset    string
	token      string
	httpClient *http.Client
	baseURL    string // Opcional, usado en pruebas con httptest.Server
}

// NewClient crea una nueva instancia de Client leyendo credenciales desde las variables de entorno.
// Retorna un error descriptivo si falta el token o el ID de proyecto requerido.
func NewClient() (*Client, error) {
	token := os.Getenv("SANITY_WRITE_TOKEN")
	if token == "" {
		return nil, errors.New("SANITY_WRITE_TOKEN es requerido en las variables de entorno")
	}

	projectID := os.Getenv("NUXT_PUBLIC_SANITY_PROJECT_ID")
	if projectID == "" {
		projectID = os.Getenv("SANITY_PROJECT_ID")
	}
	if projectID == "" {
		return nil, errors.New("NUXT_PUBLIC_SANITY_PROJECT_ID o SANITY_PROJECT_ID es requerido")
	}

	dataset := os.Getenv("NUXT_PUBLIC_SANITY_DATASET")
	if dataset == "" {
		dataset = os.Getenv("SANITY_DATASET")
	}
	if dataset == "" {
		dataset = "production"
	}

	return &Client{
		projectID:  projectID,
		dataset:    dataset,
		token:      token,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}, nil
}

// NewClientWithOptions crea un cliente con configuración explícita (útil para inyección en pruebas).
func NewClientWithOptions(projectID, dataset, token string, httpClient *http.Client, baseURL string) *Client {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}
	if dataset == "" {
		dataset = "production"
	}
	return &Client{
		projectID:  projectID,
		dataset:    dataset,
		token:      token,
		httpClient: httpClient,
		baseURL:    baseURL,
	}
}

func (c *Client) getMutationURL() string {
	if c.baseURL != "" {
		return c.baseURL
	}
	return fmt.Sprintf("https://%s.api.sanity.io/v2024-01-01/data/mutate/%s", c.projectID, c.dataset)
}

func (c *Client) getQueryURL() string {
	if c.baseURL != "" {
		return c.baseURL
	}
	return fmt.Sprintf("https://%s.api.sanity.io/v2024-01-01/data/query/%s", c.projectID, c.dataset)
}

// CreateComment implementa Writer.CreateComment.
// Crea un documento de tipo "comentario" con estado "pendiente" para moderación manual (§4, RF-07).
func (c *Client) CreateComment(ctx context.Context, productID string, text string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	payload := map[string]interface{}{
		"mutations": []map[string]interface{}{
			{
				"create": map[string]interface{}{
					"_type":         "comentario",
					"texto":         text,
					"producto":      map[string]string{"_type": "reference", "_ref": productID},
					"estado":        "pendiente",
					"fechaCreacion": now,
				},
			},
		},
	}

	return c.executeMutation(ctx, payload)
}

// CreateRating implementa Writer.CreateRating.
// Crea un documento de tipo "calificacion" con el valor numérico especificado [1, 5] (RF-06).
func (c *Client) CreateRating(ctx context.Context, productID string, value int) error {
	now := time.Now().UTC().Format(time.RFC3339)
	payload := map[string]interface{}{
		"mutations": []map[string]interface{}{
			{
				"create": map[string]interface{}{
					"_type":         "calificacion",
					"valor":         value,
					"producto":      map[string]string{"_type": "reference", "_ref": productID},
					"fechaCreacion": now,
				},
			},
		},
	}

	return c.executeMutation(ctx, payload)
}

// SearchProducts implementa Searcher.SearchProducts.
// Ejecuta una consulta GROQ utilizando parámetros tipados (params) para mitigar inyecciones (§9.11, RF-18).
func (c *Client) SearchProducts(ctx context.Context, query string) ([]map[string]interface{}, error) {
	groq := `*[_type == "producto" && activo == true && (nombre match $term || descripcion match $term)] { _id, nombre, "slug": slug.current, precio, stock }`
	payload := map[string]interface{}{
		"query": groq,
		"params": map[string]interface{}{
			"term": query + "*",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("error al serializar consulta GROQ: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.getQueryURL(), bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("error al construir solicitud HTTP para Sanity: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error de red al consultar Sanity: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("Sanity Query API retornó status %d", resp.StatusCode)
	}

	var result struct {
		Result []map[string]interface{} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error al decodificar respuesta de búsqueda Sanity: %w", err)
	}

	if result.Result == nil {
		return []map[string]interface{}{}, nil
	}
	return result.Result, nil
}

func (c *Client) executeMutation(ctx context.Context, payload map[string]interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error al serializar mutación Sanity: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.getMutationURL(), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("error al construir solicitud HTTP para Sanity: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error de red al contactar Sanity: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Sanity API retornó status %d", resp.StatusCode)
	}

	return nil
}

// CrearComentario es una función de conveniencia que instancia el cliente y crea el comentario.
func CrearComentario(ctx context.Context, payload handlers.CommentPayload) error {
	client, err := NewClient()
	if err != nil {
		return err
	}
	return client.CreateComment(ctx, payload.ProductID, payload.Text)
}

// BuscarProductos es una función helper de conveniencia para consultar productos.
func BuscarProductos(ctx context.Context, query string) ([]map[string]interface{}, error) {
	client, err := NewClient()
	if err != nil {
		return nil, err
	}
	return client.SearchProducts(ctx, query)
}
