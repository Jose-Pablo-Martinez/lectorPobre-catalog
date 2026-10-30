package sanity_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/sanity"
)

// TestSanityClient_CreateComment_Exitoso verifica la estructura de la mutación y los encabezados enviados a Sanity.
// Satisface: RF-07 (Comentarios pendientes), RNF-04 (Token privado).
func TestSanityClient_CreateComment_Exitoso(t *testing.T) {
	testToken := "sk-secret-sanity-write-token-999" // gitleaks:allow
	var receivedAuthHeader string
	var receivedBody map[string]interface{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthHeader = r.Header.Get("Authorization")
		bodyBytes, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(bodyBytes, &receivedBody)

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"results":[{"id":"comment-1"}]}`))
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", testToken, server.Client(), server.URL)

	err := client.CreateComment(context.Background(), "prod-abc", "Excelente producto")
	if err != nil {
		t.Fatalf("CreateComment esperaba nil, se obtuvo error: %v", err)
	}

	// Verificar cabecera de autorización con token privado
	expectedAuth := "Bearer " + testToken
	if receivedAuthHeader != expectedAuth {
		t.Errorf("Authorization header esperado %q, obtenido %q", expectedAuth, receivedAuthHeader)
	}

	// Verificar contenido de la mutación
	mutations, ok := receivedBody["mutations"].([]interface{})
	if !ok || len(mutations) == 0 {
		t.Fatalf("mutations no encontradas en el payload enviado a Sanity")
	}

	mutationMap := mutations[0].(map[string]interface{})
	createMap := mutationMap["create"].(map[string]interface{})

	if createMap["_type"] != "comentario" {
		t.Errorf("Esperado _type 'comentario', obtenido %v", createMap["_type"])
	}
	if createMap["estado"] != "pendiente" {
		t.Errorf("Esperado estado 'pendiente' (pre-moderación RF-07), obtenido %v", createMap["estado"])
	}
	if createMap["texto"] != "Excelente producto" {
		t.Errorf("Esperado texto 'Excelente producto', obtenido %v", createMap["texto"])
	}

	prodRef := createMap["producto"].(map[string]interface{})
	if prodRef["_ref"] != "prod-abc" {
		t.Errorf("Esperado _ref 'prod-abc', obtenido %v", prodRef["_ref"])
	}
}

// TestSanityClient_CreateRating_Exitoso verifica la mutación para calificaciones.
// Satisface: RF-06 (Calificaciones).
func TestSanityClient_CreateRating_Exitoso(t *testing.T) {
	testToken := "sk-test-token" // gitleaks:allow
	var receivedBody map[string]interface{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(bodyBytes, &receivedBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", testToken, server.Client(), server.URL)

	err := client.CreateRating(context.Background(), "prod-123", 5)
	if err != nil {
		t.Fatalf("CreateRating esperaba nil, se obtuvo error: %v", err)
	}

	mutations := receivedBody["mutations"].([]interface{})
	createMap := mutations[0].(map[string]interface{})["create"].(map[string]interface{})

	if createMap["_type"] != "calificacion" {
		t.Errorf("Esperado _type 'calificacion', obtenido %v", createMap["_type"])
	}
	if int(createMap["valor"].(float64)) != 5 {
		t.Errorf("Esperado valor 5, obtenido %v", createMap["valor"])
	}
}

// TestSanityClient_SearchProducts_Exitoso verifica la consulta parametrizada a Sanity.
// Satisface: RF-18, RNF-04, §9.11.
func TestSanityClient_SearchProducts_Exitoso(t *testing.T) {
	var receivedBody map[string]interface{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(bodyBytes, &receivedBody)

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"result":[{"_id":"p1","nombre":"Libro Uno","slug":"libro-uno","precio":200}]}`))
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token-123", server.Client(), server.URL)

	results, err := client.SearchProducts(context.Background(), "libro")
	if err != nil {
		t.Fatalf("SearchProducts esperaba nil, se obtuvo error: %v", err)
	}

	if len(results) != 1 {
		t.Fatalf("Esperado 1 resultado, obtenidos %d", len(results))
	}

	if results[0]["nombre"] != "Libro Uno" {
		t.Errorf("Esperado nombre 'Libro Uno', obtenido %v", results[0]["nombre"])
	}

	// Verificar uso de parámetros en GROQ
	params, ok := receivedBody["params"].(map[string]interface{})
	if !ok || params["term"] != "libro*" {
		t.Errorf("Esperado params con 'term' = 'libro*', obtenido %v", receivedBody["params"])
	}
}

// TestSanityClient_SearchProducts_SanityError verifica manejo de errores en búsqueda.
func TestSanityClient_SearchProducts_SanityError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)
	_, err := client.SearchProducts(context.Background(), "test")
	if err == nil {
		t.Fatalf("Se esperaba error cuando Sanity responde 500")
	}
}

// TestSanityClient_CreateComment_SanityError_NoExponeToken verifica que ante un fallo de Sanity nunca se filtre el token.
// Satisface: RNF-04, §8.
func TestSanityClient_CreateComment_SanityError_NoExponeToken(t *testing.T) {
	secretToken := "SUPER-SECRET-TOKEN-DO-NOT-LEAK-XYZ" // gitleaks:allow

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"description":"Unauthorized"}}`))
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", secretToken, server.Client(), server.URL)

	err := client.CreateComment(context.Background(), "prod-1", "texto")
	if err == nil {
		t.Fatalf("Se esperaba un error cuando Sanity responde 401, se obtuvo nil")
	}

	if strings.Contains(err.Error(), secretToken) {
		t.Fatalf("ALERTA DE SEGURIDAD: El error expone el token de Sanity: %v", err)
	}
}

// TestSanityClient_RedError_RetornaError verifica manejo de errores de red o timeouts.
func TestSanityClient_RedError_RetornaError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	serverURL := server.URL
	server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", &http.Client{Timeout: 100 * time.Millisecond}, serverURL)
	err := client.CreateComment(context.Background(), "p1", "texto")
	if err == nil {
		t.Fatalf("Se esperaba error de red para servidor cerrado")
	}
}

// TestSanityClient_NewClient_FaltanVariables verifica que NewClient falle adecuadamente si faltan env vars.
func TestSanityClient_NewClient_FaltanVariables(t *testing.T) {
	os.Unsetenv("SANITY_WRITE_TOKEN")
	os.Unsetenv("NUXT_PUBLIC_SANITY_PROJECT_ID")
	os.Unsetenv("SANITY_PROJECT_ID")

	_, err := sanity.NewClient()
	if err == nil {
		t.Errorf("NewClient debió retornar error ante ausencia de variables de entorno")
	}

	os.Setenv("SANITY_WRITE_TOKEN", "token")
	_, err2 := sanity.NewClient()
	if err2 == nil {
		t.Errorf("NewClient debió retornar error cuando falta projectID")
	}
	os.Unsetenv("SANITY_WRITE_TOKEN")
}

// TestSanityClient_NewClient_ConVariables verifica que NewClient inicialice con éxito si las variables existen.
func TestSanityClient_NewClient_ConVariables(t *testing.T) {
	os.Setenv("SANITY_WRITE_TOKEN", "token-test-123")
	os.Setenv("NUXT_PUBLIC_SANITY_PROJECT_ID", "proj-xyz")
	os.Setenv("NUXT_PUBLIC_SANITY_DATASET", "staging")
	defer func() {
		os.Unsetenv("SANITY_WRITE_TOKEN")
		os.Unsetenv("NUXT_PUBLIC_SANITY_PROJECT_ID")
		os.Unsetenv("NUXT_PUBLIC_SANITY_DATASET")
	}()

	client, err := sanity.NewClient()
	if err != nil {
		t.Fatalf("NewClient no esperaba error, se obtuvo: %v", err)
	}
	if client == nil {
		t.Fatal("NewClient retornó nil")
	}
}

// TestCrearComentario_FuncionHelper verifica la función helper de conveniencia CrearComentario.
func TestCrearComentario_FuncionHelper(t *testing.T) {
	os.Unsetenv("SANITY_WRITE_TOKEN")
	payload := handlers.CommentPayload{ProductID: "p1", Text: "hola"}
	err := sanity.CrearComentario(context.Background(), payload)
	if err == nil {
		t.Errorf("CrearComentario debió fallar por falta de credenciales")
	}
}

// TestBuscarProductos_FuncionHelper verifica la función helper de conveniencia BuscarProductos.
func TestBuscarProductos_FuncionHelper(t *testing.T) {
	os.Unsetenv("SANITY_WRITE_TOKEN")
	_, err := sanity.BuscarProductos(context.Background(), "libro")
	if err == nil {
		t.Errorf("BuscarProductos debió fallar por falta de credenciales")
	}
}
