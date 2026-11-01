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
	"strings"
	"time"

	"github.com/tu-org/lectorpobre/pkg/handlers"
)

const (
	contentTypeJSON     = "application/json"
	headerContentType   = "Content-Type"
	headerAuthorization = "Authorization"
	authBearerPrefix    = "Bearer "
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

// ReviewWriter extiende Writer para soportar actualización determinista por usuario (upsert)
// y asociación de calificación por estrellas dentro del documento de comentario.
type ReviewWriter interface {
	Writer
	UpsertComment(ctx context.Context, p handlers.CommentPayload) error
	UpsertRating(ctx context.Context, p handlers.RatingPayload) error
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
	token := strings.Trim(strings.TrimSpace(os.Getenv("SANITY_WRITE_TOKEN")), `"'`)
	if token == "" {
		return nil, errors.New("SANITY_WRITE_TOKEN es requerido en las variables de entorno")
	}

	projectID := strings.Trim(strings.TrimSpace(os.Getenv("NUXT_PUBLIC_SANITY_PROJECT_ID")), `"'`)
	if projectID == "" {
		projectID = strings.Trim(strings.TrimSpace(os.Getenv("SANITY_PROJECT_ID")), `"'`)
	}
	if projectID == "" {
		return nil, errors.New("NUXT_PUBLIC_SANITY_PROJECT_ID o SANITY_PROJECT_ID es requerido")
	}

	dataset := strings.Trim(strings.TrimSpace(os.Getenv("NUXT_PUBLIC_SANITY_DATASET")), `"'`)
	if dataset == "" {
		dataset = strings.Trim(strings.TrimSpace(os.Getenv("SANITY_DATASET")), `"'`)
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
	base := fmt.Sprintf("https://%s.api.sanity.io", c.projectID)
	if c.baseURL != "" {
		base = strings.TrimRight(c.baseURL, "/")
	}
	return fmt.Sprintf("%s/v2024-01-01/data/mutate/%s", base, c.dataset)
}

func (c *Client) getQueryURL() string {
	base := fmt.Sprintf("https://%s.api.sanity.io", c.projectID)
	if c.baseURL != "" {
		base = strings.TrimRight(c.baseURL, "/")
	}
	return fmt.Sprintf("%s/v2024-01-01/data/query/%s", base, c.dataset)
}

func sanitizeIDSegment(raw string) string {
	var b strings.Builder
	for _, r := range strings.TrimSpace(raw) {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			b.WriteRune(r)
		} else {
			b.WriteByte('-')
		}
	}
	return strings.Trim(b.String(), "-")
}

func buildDeterministicID(prefix, productID, userID string) string {
	return fmt.Sprintf("%s-%s-%s", prefix, sanitizeIDSegment(productID), sanitizeIDSegment(userID))
}

type existingCommentInfo struct {
	ID     string `json:"_id"`
	Texto  string `json:"texto"`
	Estado string `json:"estado"`
}

// postJSON ejecuta una solicitud HTTP POST con cuerpo JSON y encabezados de autenticación hacia Sanity.
// Si out no es nil, decodifica el cuerpo de la respuesta en la estructura proporcionada.
func (c *Client) postJSON(ctx context.Context, endpointURL string, payload interface{}, out interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error al serializar payload para Sanity: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("error al construir solicitud HTTP para Sanity: %w", err)
	}

	req.Header.Set(headerContentType, contentTypeJSON)
	if c.token != "" {
		req.Header.Set(headerAuthorization, authBearerPrefix+c.token)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error de red al contactar Sanity: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Sanity API retornó status %d", resp.StatusCode)
	}

	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			return fmt.Errorf("error al decodificar respuesta de Sanity: %w", err)
		}
	}

	return nil
}

func (c *Client) getExistingComment(ctx context.Context, id string) (*existingCommentInfo, error) {
	payload := map[string]interface{}{
		"query": `*[_id == $id][0]{ _id, texto, estado }`,
		"params": map[string]interface{}{
			"id": id,
		},
	}

	var response struct {
		Result *existingCommentInfo `json:"result"`
	}
	if err := c.postJSON(ctx, c.getQueryURL(), payload, &response); err != nil {
		return nil, fmt.Errorf("error al consultar comentario existente: %w", err)
	}

	return response.Result, nil
}

// UpsertComment crea o actualiza el comentario de un usuario para un producto.
// Satisface: RF-07 (Comentarios con pre-moderación).
// Regla de moderación:
// - Si el comentario ya existía y el texto no fue modificado (solo cambiaron las estrellas),
//   se conserva el estado de moderación previo (ej. "aprobado") y se actualiza únicamente "calificacion".
// - Si el comentario es nuevo o el texto fue modificado, pasa al estado "pendiente" para moderación manual.
func (c *Client) UpsertComment(ctx context.Context, p handlers.CommentPayload) error {
	now := time.Now().UTC().Format(time.RFC3339)
	userID := strings.TrimSpace(p.UserID)
	var docID string

	if userID != "" {
		docID = buildDeterministicID("comentario", p.ProductID, userID)
		existing, err := c.getExistingComment(ctx, docID)
		if err == nil && existing != nil && strings.TrimSpace(existing.Texto) == strings.TrimSpace(p.Text) {
			// El texto no cambió: solo se actualiza la calificación conservando el estado de moderación (ej. aprobado)
			if p.Rating >= 1 && p.Rating <= 5 {
				payload := map[string]interface{}{
					"mutations": []map[string]interface{}{
						{
							"patch": map[string]interface{}{
								"id": docID,
								"set": map[string]interface{}{
									"calificacion": p.Rating,
								},
							},
						},
					},
				}
				return c.executeMutation(ctx, payload)
			}
			return nil
		}
	}

	doc := map[string]interface{}{
		"_type":         "comentario",
		"texto":         p.Text,
		"producto":      map[string]string{"_type": "reference", "_ref": p.ProductID},
		"estado":        "pendiente",
		"fechaCreacion": now,
	}
	if p.Rating >= 1 && p.Rating <= 5 {
		doc["calificacion"] = p.Rating
	}

	mutationKey := "create"
	if userID != "" {
		doc["_id"] = docID
		doc["usuarioId"] = userID
		mutationKey = "createOrReplace"
	}

	payload := map[string]interface{}{
		"mutations": []map[string]interface{}{
			{mutationKey: doc},
		},
	}

	return c.executeMutation(ctx, payload)
}

// CreateComment implementa Writer.CreateComment.
// Crea un documento de tipo "comentario" con estado "pendiente" para moderación manual (§4, RF-07).
func (c *Client) CreateComment(ctx context.Context, productID string, text string) error {
	return c.UpsertComment(ctx, handlers.CommentPayload{
		ProductID: productID,
		Text:      text,
	})
}

func buildRatingCounterPatch(productID string, value int, previousValue int) map[string]interface{} {
	setIfMissing := map[string]interface{}{
		"ratingSum":    0,
		"ratingCount":  0,
		"rating1Count": 0,
		"rating2Count": 0,
		"rating3Count": 0,
		"rating4Count": 0,
		"rating5Count": 0,
	}

	if previousValue >= 1 && previousValue <= 5 {
		if previousValue == value {
			return nil
		}
		return map[string]interface{}{
			"id":           productID,
			"setIfMissing": setIfMissing,
			"inc": map[string]interface{}{
				"ratingSum": value - previousValue,
				fmt.Sprintf("rating%dCount", previousValue): -1,
				fmt.Sprintf("rating%dCount", value):         1,
			},
		}
	}

	return map[string]interface{}{
		"id":           productID,
		"setIfMissing": setIfMissing,
		"inc": map[string]interface{}{
			"ratingSum":                         value,
			"ratingCount":                       1,
			fmt.Sprintf("rating%dCount", value): 1,
		},
	}
}

// UpsertRating crea o reemplaza la calificación de un usuario y actualiza atómicamente los contadores del producto.
func (c *Client) UpsertRating(ctx context.Context, p handlers.RatingPayload) error {
	now := time.Now().UTC().Format(time.RFC3339)
	doc := map[string]interface{}{
		"_type":         "calificacion",
		"valor":         p.Value,
		"producto":      map[string]string{"_type": "reference", "_ref": p.ProductID},
		"fechaCreacion": now,
	}

	mutationKey := "create"
	userID := strings.TrimSpace(p.UserID)
	if userID != "" {
		doc["_id"] = buildDeterministicID("calificacion", p.ProductID, userID)
		doc["usuarioId"] = userID
		mutationKey = "createOrReplace"
	}

	mutations := []map[string]interface{}{
		{mutationKey: doc},
	}
	if patch := buildRatingCounterPatch(p.ProductID, p.Value, p.PreviousValue); patch != nil {
		mutations = append(mutations, map[string]interface{}{"patch": patch})
	}

	return c.executeMutation(ctx, map[string]interface{}{"mutations": mutations})
}

// CreateRating implementa Writer.CreateRating.
// Crea un documento de tipo "calificacion" con el valor numérico especificado [1, 5] (RF-06).
func (c *Client) CreateRating(ctx context.Context, productID string, value int) error {
	return c.UpsertRating(ctx, handlers.RatingPayload{
		ProductID: productID,
		Value:     value,
	})
}

// DispatchComment enruta la escritura de un comentario hacia ReviewWriter (si soporta upsert/calificación) o Writer.
func DispatchComment(ctx context.Context, w Writer, p handlers.CommentPayload) error {
	if rw, ok := w.(ReviewWriter); ok && (p.Rating > 0 || strings.TrimSpace(p.UserID) != "") {
		return rw.UpsertComment(ctx, p)
	}
	return w.CreateComment(ctx, p.ProductID, p.Text)
}

// DispatchRating enruta la escritura de una calificación hacia ReviewWriter (si soporta upsert) o Writer.
func DispatchRating(ctx context.Context, w Writer, p handlers.RatingPayload) error {
	if rw, ok := w.(ReviewWriter); ok && (p.PreviousValue > 0 || strings.TrimSpace(p.UserID) != "") {
		return rw.UpsertRating(ctx, p)
	}
	return w.CreateRating(ctx, p.ProductID, p.Value)
}

// SearchProducts implementa Searcher.SearchProducts.
// Ejecuta una consulta GROQ utilizando parámetros tipados (params) para mitigar inyecciones (§9.11, RF-18).
func (c *Client) SearchProducts(ctx context.Context, query string) ([]map[string]interface{}, error) {
	payload := map[string]interface{}{
		"query": `*[_type == "producto" && activo == true && (nombre match $term || descripcion match $term)] { _id, nombre, "slug": slug.current, precio, stock }`,
		"params": map[string]interface{}{
			"term": query + "*",
		},
	}

	var response struct {
		Result []map[string]interface{} `json:"result"`
	}
	if err := c.postJSON(ctx, c.getQueryURL(), payload, &response); err != nil {
		return nil, fmt.Errorf("error al consultar Sanity: %w", err)
	}

	if response.Result == nil {
		return []map[string]interface{}{}, nil
	}
	return response.Result, nil
}

func (c *Client) executeMutation(ctx context.Context, payload map[string]interface{}) error {
	return c.postJSON(ctx, c.getMutationURL(), payload, nil)
}

// CrearComentario es una función de conveniencia que instancia el cliente y crea el comentario.
func CrearComentario(ctx context.Context, payload handlers.CommentPayload) error {
	client, err := NewClient()
	if err != nil {
		return err
	}
	return DispatchComment(ctx, client, payload)
}

// BuscarProductos es una función helper de conveniencia para consultar productos.
func BuscarProductos(ctx context.Context, query string) ([]map[string]interface{}, error) {
	client, err := NewClient()
	if err != nil {
		return nil, err
	}
	return client.SearchProducts(ctx, query)
}
