package sanity_test

import (
	"context"
	"encoding/json"
	"fmt"
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

const testReviewSecret = "test-review-secret-32-bytes-key!" // gitleaks:allow

// TestSanityClient_CreateComment_Exitoso verifica la estructura de la mutación y los encabezados enviados a Sanity.
// Satisface: RF-07 (Comentarios pendientes), RNF-04 (Token privado).
func TestSanityClient_CreateComment_Exitoso(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	testToken := "sk-secret-sanity-write-token-999" // gitleaks:allow
	var receivedAuthHeader string
	var receivedBody map[string]interface{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthHeader = r.Header.Get("Authorization")
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if strings.Contains(string(bodyBytes), "activo == true") {
				_, _ = w.Write([]byte(`{"result":"prod-abc"}`))
			} else {
				_, _ = w.Write([]byte(`{"result":null}`))
			}
			return
		}
		_ = json.Unmarshal(bodyBytes, &receivedBody)

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"results":[{"id":"comment-1"}]}`))
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", testToken, server.Client(), server.URL)

	err := client.UpsertComment(context.Background(), handlers.CommentPayload{
		ProductID: "prod-abc",
		Text:      "Excelente producto",
		UserID:    "usr-1",
	})
	if err != nil {
		t.Fatalf("UpsertComment esperaba nil, se obtuvo error: %v", err)
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
	createMap := mutationMap["createOrReplace"].(map[string]interface{})

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

// TestSanityClient_CreateRating_Exitoso verifica la mutación para calificaciones nuevas (valor previo del servidor = 0).
// Satisface: RF-06 (Calificaciones).
func TestSanityClient_CreateRating_Exitoso(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	testToken := "sk-test-token" // gitleaks:allow
	var receivedBody map[string]interface{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if strings.Contains(string(bodyBytes), "activo == true") {
				_, _ = w.Write([]byte(`{"result":"prod-123"}`))
			} else {
				_, _ = w.Write([]byte(`{"result":null}`))
			}
			return
		}
		_ = json.Unmarshal(bodyBytes, &receivedBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", testToken, server.Client(), server.URL)

	err := client.UpsertRating(context.Background(), handlers.RatingPayload{
		ProductID: "prod-123",
		Value:     5,
		UserID:    "usr-1",
	})
	if err != nil {
		t.Fatalf("UpsertRating esperaba nil, se obtuvo error: %v", err)
	}

	mutations := receivedBody["mutations"].([]interface{})
	createMap := mutations[0].(map[string]interface{})["createOrReplace"].(map[string]interface{})

	if createMap["_type"] != "calificacion" {
		t.Errorf("Esperado _type 'calificacion', obtenido %v", createMap["_type"])
	}
	if int(createMap["valor"].(float64)) != 5 {
		t.Errorf("Esperado valor 5, obtenido %v", createMap["valor"])
	}
}

// TestSanityClient_SearchProducts_Exitoso verifica la consulta parametrizada a Sanity y que no envíe Authorization (V-10).
// Satisface: RF-18, RNF-04, §9.11.
func TestSanityClient_SearchProducts_Exitoso(t *testing.T) {
	var receivedBody map[string]interface{}
	var receivedAuthHeader string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuthHeader = r.Header.Get("Authorization")
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

	if receivedAuthHeader != "" {
		t.Errorf("SearchProducts no debe enviar cabecera Authorization (V-10), obtenido %q", receivedAuthHeader)
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
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	secretToken := "SUPER-SECRET-TOKEN-DO-NOT-LEAK-XYZ" // gitleaks:allow

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":{"description":"Unauthorized"}}`))
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", secretToken, server.Client(), server.URL)

	err := client.UpsertComment(context.Background(), handlers.CommentPayload{ProductID: "prod-1", Text: "texto", UserID: "usr-1"})
	if err == nil {
		t.Fatalf("Se esperaba un error cuando Sanity responde 401, se obtuvo nil")
	}

	if strings.Contains(err.Error(), secretToken) {
		t.Fatalf("ALERTA DE SEGURIDAD: El error expone el token de Sanity: %v", err)
	}
}

// TestSanityClient_RedError_RetornaError verifica manejo de errores de red o timeouts.
func TestSanityClient_RedError_RetornaError(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	serverURL := server.URL
	server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", &http.Client{Timeout: 100 * time.Millisecond}, serverURL)
	err := client.UpsertComment(context.Background(), handlers.CommentPayload{ProductID: "p1", Text: "texto", UserID: "usr-1"})
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

// TestSanityClient_NewClient_ConVariables verifica que NewClient y NewPublicClient inicialicen con éxito (V-10).
func TestSanityClient_NewClient_ConVariables(t *testing.T) {
	t.Setenv("SANITY_REVIEWS_TOKEN", "reviews-token-scoped-123")
	t.Setenv("SANITY_WRITE_TOKEN", "token-test-123")
	t.Setenv("NUXT_PUBLIC_SANITY_PROJECT_ID", "proj-xyz")
	t.Setenv("NUXT_PUBLIC_SANITY_DATASET", "staging")

	client, err := sanity.NewClient()
	if err != nil {
		t.Fatalf("NewClient no esperaba error, se obtuvo: %v", err)
	}
	if client == nil {
		t.Fatal("NewClient retornó nil")
	}

	// NewPublicClient debe funcionar incluso sin ningún token de escritura
	t.Setenv("SANITY_REVIEWS_TOKEN", "")
	t.Setenv("SANITY_WRITE_TOKEN", "")
	pubClient, errPub := sanity.NewPublicClient()
	if errPub != nil || pubClient == nil {
		t.Fatalf("NewPublicClient no debe requerir token de escritura, error: %v", errPub)
	}

	// NewPublicClient falla si falta projectID
	t.Setenv("NUXT_PUBLIC_SANITY_PROJECT_ID", "")
	t.Setenv("SANITY_PROJECT_ID", "")
	if _, errNoProj := sanity.NewPublicClient(); errNoProj == nil {
		t.Errorf("NewPublicClient debió retornar error cuando falta projectID")
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
	t.Setenv("NUXT_PUBLIC_SANITY_PROJECT_ID", "")
	t.Setenv("SANITY_PROJECT_ID", "")
	_, err := sanity.BuscarProductos(context.Background(), "libro")
	if err == nil {
		t.Errorf("BuscarProductos debió fallar por falta de projectID")
	}
}

// TestSanityClient_UpsertComment_ConUserIDYRating verifica createOrReplace, calificación asociada y opacidad del userId (V-01).
func TestSanityClient_UpsertComment_ConUserIDYRating(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	var receivedBody map[string]interface{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if strings.Contains(string(bodyBytes), "activo == true") {
				_, _ = w.Write([]byte(`{"result":"prod-123"}`))
			} else {
				_, _ = w.Write([]byte(`{"result":null}`))
			}
			return
		}
		_ = json.Unmarshal(bodyBytes, &receivedBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	rawUserID := "usr_secret_browser_id_123"
	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)
	err := client.UpsertComment(context.Background(), handlers.CommentPayload{
		ProductID: "prod-1",
		Text:      "Muy buen libro",
		Rating:    4,
		UserID:    rawUserID,
	})
	if err != nil {
		t.Fatalf("UpsertComment esperaba nil, obtuvo: %v", err)
	}

	mutations := receivedBody["mutations"].([]interface{})
	upsertMap := mutations[0].(map[string]interface{})["createOrReplace"].(map[string]interface{})

	expectedID, err := sanity.BuildReviewDocumentID("comentario", "prod-1", rawUserID)
	if err != nil {
		t.Fatalf("BuildReviewDocumentID falló: %v", err)
	}
	docID, _ := upsertMap["_id"].(string)
	if docID != expectedID {
		t.Errorf("Esperado _id opaco %q, obtenido %q", expectedID, docID)
	}
	if strings.Contains(docID, rawUserID) {
		t.Errorf("ALERTA V-01: _id %q contiene el userId en claro %q", docID, rawUserID)
	}
	if int(upsertMap["calificacion"].(float64)) != 4 {
		t.Errorf("Esperado calificacion 4, obtenido %v", upsertMap["calificacion"])
	}
	storedUserID, _ := upsertMap["usuarioId"].(string)
	if storedUserID == "" || strings.Contains(storedUserID, rawUserID) {
		t.Errorf("ALERTA V-01: usuarioId almacenado %q no debe contener el userId en claro %q", storedUserID, rawUserID)
	}
}

// TestSanityClient_UpsertRating_ActualizacionContadores verifica createOrReplace y patch diferencial
// usando el valor previo almacenado en el servidor e ignorando el PreviousValue enviado por el cliente (V-02).
func TestSanityClient_UpsertRating_ActualizacionContadores(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	var receivedBody map[string]interface{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if strings.Contains(string(bodyBytes), "activo == true") {
				_, _ = w.Write([]byte(`{"result":"prod-123"}`))
			} else {
				// El servidor tiene registrado valor = 3 para este usuario
				_, _ = w.Write([]byte(`{"result":{"_id":"calificacion-prod-1-opaque","valor":3}}`))
			}
			return
		}
		_ = json.Unmarshal(bodyBytes, &receivedBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)
	// El cliente envía PreviousValue: 1 manipulado; el servidor debe usar su propio valor previo (3).
	err := client.UpsertRating(context.Background(), handlers.RatingPayload{
		ProductID:     "prod-1",
		Value:         5,
		PreviousValue: 1,
		UserID:        "usr-99",
	})
	if err != nil {
		t.Fatalf("UpsertRating esperaba nil, obtuvo: %v", err)
	}

	mutations := receivedBody["mutations"].([]interface{})
	if len(mutations) != 2 {
		t.Fatalf("Esperadas 2 mutaciones (createOrReplace + patch), obtenidas %d", len(mutations))
	}

	expectedID, _ := sanity.BuildReviewDocumentID("calificacion", "prod-1", "usr-99")
	upsertMap := mutations[0].(map[string]interface{})["createOrReplace"].(map[string]interface{})
	if upsertMap["_id"] != expectedID {
		t.Errorf("Esperado _id opaco %q, obtenido %v", expectedID, upsertMap["_id"])
	}
	if strings.Contains(upsertMap["_id"].(string), "usr-99") {
		t.Errorf("ALERTA V-01: _id de calificación contiene userId en claro: %v", upsertMap["_id"])
	}

	patchMap := mutations[1].(map[string]interface{})["patch"].(map[string]interface{})
	incMap := patchMap["inc"].(map[string]interface{})
	if int(incMap["ratingSum"].(float64)) != 2 {
		t.Errorf("Esperado delta ratingSum = 2 (5 - 3 del servidor), obtenido %v", incMap["ratingSum"])
	}
	if int(incMap["rating3Count"].(float64)) != -1 {
		t.Errorf("Esperado rating3Count = -1, obtenido %v", incMap["rating3Count"])
	}
	if int(incMap["rating5Count"].(float64)) != 1 {
		t.Errorf("Esperado rating5Count = 1, obtenido %v", incMap["rating5Count"])
	}
}

// TestSanityClient_UpsertRating_MismoValorPrevioNoEnviaPatch verifica que si el valor almacenado en el servidor
// coincide con el nuevo valor, no se parchen contadores aunque el cliente envíe un PreviousValue distinto (V-02).
func TestSanityClient_UpsertRating_MismoValorPrevioNoEnviaPatch(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	var receivedBody map[string]interface{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if strings.Contains(string(bodyBytes), "activo == true") {
				_, _ = w.Write([]byte(`{"result":"prod-123"}`))
			} else {
				_, _ = w.Write([]byte(`{"result":{"_id":"calificacion-prod-1-usr-99","valor":4}}`))
			}
			return
		}
		_ = json.Unmarshal(bodyBytes, &receivedBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)
	err := sanity.DispatchRating(context.Background(), client, handlers.RatingPayload{
		ProductID:     "prod-1",
		Value:         4,
		PreviousValue: 1,
		UserID:        "usr-99",
	})
	if err != nil {
		t.Fatalf("DispatchRating esperaba nil, obtuvo: %v", err)
	}

	mutations := receivedBody["mutations"].([]interface{})
	if len(mutations) != 1 {
		t.Fatalf("Esperada solo 1 mutación cuando el valor en servidor == value, obtenidas %d", len(mutations))
	}
}

// TestDispatchComment_EnrutaCorrectamente verifica DispatchComment con ReviewWriter y rechazo sin UserID.
func TestDispatchComment_EnrutaCorrectamente(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	var receivedBody map[string]interface{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if strings.Contains(string(bodyBytes), "activo == true") {
				_, _ = w.Write([]byte(`{"result":"prod-123"}`))
			} else {
				_, _ = w.Write([]byte(`{"result":null}`))
			}
			return
		}
		_ = json.Unmarshal(bodyBytes, &receivedBody)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)
	if err := sanity.DispatchComment(context.Background(), client, handlers.CommentPayload{
		ProductID: "p1",
		Text:      "Texto válido",
		Rating:    5,
		UserID:    "u1",
	}); err != nil {
		t.Fatalf("DispatchComment con ReviewWriter falló: %v", err)
	}

	if err := sanity.DispatchComment(context.Background(), client, handlers.CommentPayload{
		ProductID: "p1",
		Text:      "Texto sin user",
	}); err != handlers.ErrUserIDRequired {
		t.Fatalf("DispatchComment sin UserID esperaba ErrUserIDRequired, obtuvo: %v", err)
	}

	if err := client.CreateRating(context.Background(), "p1", 5); err != handlers.ErrUserIDRequired {
		t.Fatalf("CreateRating sin UserID esperaba ErrUserIDRequired, obtuvo: %v", err)
	}
}

func createSanityMockServer(existingTexto string, captured *[]interface{}) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if strings.Contains(string(bodyBytes), "activo == true") {
				_, _ = w.Write([]byte(`{"result":"p1"}`))
				return
			}
			fmt.Fprintf(w, `{"result":{"_id":"comentario-p1-u1","texto":%q,"estado":"aprobado"}}`, existingTexto)
			return
		}

		var body map[string]interface{}
		_ = json.Unmarshal(bodyBytes, &body)
		if m, ok := body["mutations"].([]interface{}); ok {
			*captured = m
		}
		w.WriteHeader(http.StatusOK)
	}))
}

func executeUpsertCommentTest(t *testing.T, existingTexto, newTexto string, rating int) map[string]interface{} {
	t.Helper()
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	var capturedMutations []interface{}
	server := createSanityMockServer(existingTexto, &capturedMutations)
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)
	err := client.UpsertComment(context.Background(), handlers.CommentPayload{
		ProductID: "p1",
		Text:      newTexto,
		Rating:    rating,
		UserID:    "u1",
	})
	if err != nil {
		t.Fatalf("UpsertComment retorno error inesperado: %v", err)
	}

	if len(capturedMutations) != 1 {
		t.Fatalf("Se esperaba 1 mutacion, obtenidas %d", len(capturedMutations))
	}

	rawMutation, ok := capturedMutations[0].(map[string]interface{})
	if !ok {
		t.Fatalf("Formato de mutacion inesperado: %v", capturedMutations[0])
	}
	return rawMutation
}

func verifyPatchMutation(t *testing.T, mutation map[string]interface{}, expectedRating int) {
	t.Helper()
	patchMap, ok := mutation["patch"].(map[string]interface{})
	if !ok {
		t.Fatalf("Esperada mutacion patch, obtenida: %v", mutation)
	}
	expectedID, _ := sanity.BuildReviewDocumentID("comentario", "p1", "u1")
	if patchMap["id"] != expectedID {
		t.Errorf("ID de patch esperado %q, obtenido %v", expectedID, patchMap["id"])
	}
	setMap, ok := patchMap["set"].(map[string]interface{})
	if !ok {
		t.Fatalf("setMap invalido: %v", patchMap["set"])
	}
	if int(setMap["calificacion"].(float64)) != expectedRating {
		t.Errorf("Calificacion en patch esperada %d, obtenida %v", expectedRating, setMap["calificacion"])
	}
	if _, hasEstado := setMap["estado"]; hasEstado {
		t.Errorf("Patch no debe alterar el estado de moderacion previo: %v", setMap)
	}
}

func verifyCreateOrReplaceMutation(t *testing.T, mutation map[string]interface{}, expectedText, expectedEstado string, expectedRating int) {
	t.Helper()
	createMap, ok := mutation["createOrReplace"].(map[string]interface{})
	if !ok {
		t.Fatalf("Esperada mutacion createOrReplace, obtenida: %v", mutation)
	}
	if createMap["estado"] != expectedEstado {
		t.Errorf("Estado esperado %q, obtenido %v", expectedEstado, createMap["estado"])
	}
	if createMap["texto"] != expectedText {
		t.Errorf("Texto esperado %q, obtenido %v", expectedText, createMap["texto"])
	}
	if int(createMap["calificacion"].(float64)) != expectedRating {
		t.Errorf("Calificacion esperada %d, obtenida %v", expectedRating, createMap["calificacion"])
	}
}

// TestSanityClient_UpsertComment_ReglasModeracion verifica mediante subtests que:
// 1) Si solo cambia la calificación, se envía patch y se conserva el estado de moderación (RF-07).
// 2) Si se modifica el texto, pasa obligatoriamente a estado 'pendiente' para re-moderación (RF-07).
func TestSanityClient_UpsertComment_ReglasModeracion(t *testing.T) {
	t.Run("Solo calificacion conserva estado", func(t *testing.T) {
		mutation := executeUpsertCommentTest(t, "Mismo texto", "Mismo texto", 1)
		verifyPatchMutation(t, mutation, 1)
	})

	t.Run("Modifica texto pasa a pendiente", func(t *testing.T) {
		mutation := executeUpsertCommentTest(t, "Texto anterior", "Texto con cambios sustanciales", 2)
		verifyCreateOrReplaceMutation(t, mutation, "Texto con cambios sustanciales", "pendiente", 2)
	})
}

// TestSanityClient_ProductoNoEncontrado_RechazaMutacion verifica que UpsertComment y UpsertRating
// retornen ErrProductNotFound y no ejecuten mutaciones cuando el ID no corresponde a un producto activo (V-03).
func TestSanityClient_ProductoNoEncontrado_RechazaMutacion(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	mutateCalled := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/data/query") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"result":null}`))
			return
		}
		mutateCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)

	errComment := client.UpsertComment(context.Background(), handlers.CommentPayload{
		ProductID: "global-config",
		Text:      "Intento sobre documento que no es producto",
		UserID:    "usr-1",
	})
	if errComment != handlers.ErrProductNotFound {
		t.Errorf("UpsertComment esperaba ErrProductNotFound, obtuvo: %v", errComment)
	}

	errRating := client.UpsertRating(context.Background(), handlers.RatingPayload{
		ProductID: "cat-1",
		Value:     5,
		UserID:    "usr-1",
	})
	if errRating != handlers.ErrProductNotFound {
		t.Errorf("UpsertRating esperaba ErrProductNotFound, obtuvo: %v", errRating)
	}

	if mutateCalled {
		t.Errorf("No debió invocarse el endpoint de mutación cuando el producto no existe o no está activo")
	}
}

// TestSanityClient_UpsertRating_ErrorAlConsultarExistente verifica que si falla la consulta de calificación o comentario previo se retorne error (V-02, M-6).
func TestSanityClient_UpsertRating_ErrorAlConsultarExistente(t *testing.T) {
	t.Setenv("REVIEW_ID_SECRET", testReviewSecret)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		if strings.Contains(string(bodyBytes), "activo == true") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"result":"prod-1"}`))
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := sanity.NewClientWithOptions("test-proj", "staging", "token", server.Client(), server.URL)
	err := client.UpsertRating(context.Background(), handlers.RatingPayload{
		ProductID: "prod-1",
		Value:     5,
		UserID:    "usr-1",
	})
	if err == nil {
		t.Fatalf("Se esperaba error cuando falla getExistingRating, obtuvo nil")
	}

	errComment := client.UpsertComment(context.Background(), handlers.CommentPayload{
		ProductID: "prod-1",
		Text:      "Comentario válido",
		UserID:    "usr-1",
	})
	if errComment == nil {
		t.Fatalf("Se esperaba error cuando falla getExistingComment (M-6), obtuvo nil")
	}
}

// TestSanityClient_SinReviewIDSecret_FallaCerrado verifica que sin REVIEW_ID_SECRET se rechace derivar IDs (V-01).
func TestSanityClient_SinReviewIDSecret_FallaCerrado(t *testing.T) {
	os.Unsetenv("REVIEW_ID_SECRET")
	client := sanity.NewClientWithOptions("test-proj", "staging", "token", nil, "http://127.0.0.1:0")

	if _, err := sanity.BuildReviewDocumentID("comentario", "prod-1", "usr-1"); err == nil {
		t.Errorf("BuildReviewDocumentID debió fallar sin REVIEW_ID_SECRET")
	}
	if err := client.UpsertComment(context.Background(), handlers.CommentPayload{ProductID: "prod-1", Text: "Hola", UserID: "usr-1"}); err == nil {
		t.Errorf("UpsertComment debió fallar cerrado sin REVIEW_ID_SECRET")
	}
	if err := client.UpsertRating(context.Background(), handlers.RatingPayload{ProductID: "prod-1", Value: 5, UserID: "usr-1"}); err == nil {
		t.Errorf("UpsertRating debió fallar cerrado sin REVIEW_ID_SECRET")
	}
}
