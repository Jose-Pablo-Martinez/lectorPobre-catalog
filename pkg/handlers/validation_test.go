package handlers_test

import (
	"strings"
	"testing"

	"github.com/tu-org/lectorpobre/pkg/handlers"
)

// UT-GO-01: TestValidarComentario_TextoValido_RetornaNil verifica que un comentario de 50 caracteres con productoId sea válido.
// Satisface: RF-07, VyV §3.1.
func TestValidarComentario_TextoValido_RetornaNil(t *testing.T) {
	payload := handlers.CommentPayload{
		ProductID: "prod-12345",
		Text:      "Excelente producto, llegó en perfectas condiciones y rápido.",
	}

	if err := handlers.ValidateComment(payload); err != nil {
		t.Errorf("ValidateComment esperaba nil, se obtuvo error: %v", err)
	}

	if err := handlers.ValidarComentario(payload); err != nil {
		t.Errorf("ValidarComentario (alias) esperaba nil, se obtuvo: %v", err)
	}
}

// UT-GO-02: TestValidarComentario_TextoVacio_RetornaError verifica que un texto vacío o de solo espacios sea rechazado.
// Satisface: RF-07, VyV §3.1.
func TestValidarComentario_TextoVacio_RetornaError(t *testing.T) {
	testCases := []string{"", "   ", "\t\n"}

	for _, text := range testCases {
		payload := handlers.CommentPayload{
			ProductID: "prod-12345",
			Text:      text,
		}

		err := handlers.ValidateComment(payload)
		if err == nil {
			t.Errorf("ValidateComment esperaba error para texto %q, se obtuvo nil", text)
		}
	}
}

// UT-GO-03: TestValidarComentario_TextoExcede1000Chars_RetornaError verifica que un texto de 1001 caracteres sea rechazado.
// Satisface: RF-07, RNF-04, VyV §3.1.
func TestValidarComentario_TextoExcede1000Chars_RetornaError(t *testing.T) {
	longText := strings.Repeat("a", 1001)
	payload := handlers.CommentPayload{
		ProductID: "prod-12345",
		Text:      longText,
	}

	err := handlers.ValidateComment(payload)
	if err == nil {
		t.Fatalf("ValidateComment esperaba error para texto de 1001 caracteres, se obtuvo nil")
	}

	// Frontera válida: exactamente 1000 caracteres debe ser aceptado
	exact1000 := strings.Repeat("a", 1000)
	payloadValid := handlers.CommentPayload{
		ProductID: "prod-12345",
		Text:      exact1000,
	}
	if errValid := handlers.ValidateComment(payloadValid); errValid != nil {
		t.Errorf("ValidateComment esperaba nil para exactamente 1000 caracteres, se obtuvo: %v", errValid)
	}
}

// UT-GO-04: TestValidarComentario_ProductoIDVacio_RetornaError verifica que un payload sin ProductID retorne error.
// Satisface: RF-07, VyV §3.1.
func TestValidarComentario_ProductoIDVacio_RetornaError(t *testing.T) {
	testCases := []string{"", "   "}

	for _, pid := range testCases {
		payload := handlers.CommentPayload{
			ProductID: pid,
			Text:      "Comentario válido de prueba",
		}

		err := handlers.ValidateComment(payload)
		if err == nil {
			t.Errorf("ValidateComment esperaba error para productId %q, se obtuvo nil", pid)
		}
	}
}

// UT-GO-05: TestValidarCalificacion_Valor3_RetornaNil verifica que una calificación con valor 3 sea válida.
// Satisface: RF-06, VyV §3.1.
func TestValidarCalificacion_Valor3_RetornaNil(t *testing.T) {
	payload := handlers.RatingPayload{
		ProductID: "prod-12345",
		Value:     3,
	}

	if err := handlers.ValidateRating(payload); err != nil {
		t.Errorf("ValidateRating esperaba nil para valor 3, se obtuvo: %v", err)
	}

	if err := handlers.ValidarCalificacion(payload); err != nil {
		t.Errorf("ValidarCalificacion (alias) esperaba nil, se obtuvo: %v", err)
	}

	// Verificar también fronteras válidas: 1 y 5
	for _, v := range []int{1, 5} {
		p := handlers.RatingPayload{ProductID: "prod-12345", Value: v}
		if err := handlers.ValidateRating(p); err != nil {
			t.Errorf("ValidateRating esperaba nil para valor frontera %d, se obtuvo: %v", v, err)
		}
	}
}

// UT-GO-06: TestValidarCalificacion_Valor0_RetornaError verifica frontera inferior inválida (BVA: valor = 0).
// Satisface: RF-06, VyV §3.1.
func TestValidarCalificacion_Valor0_RetornaError(t *testing.T) {
	payload := handlers.RatingPayload{
		ProductID: "prod-12345",
		Value:     0,
	}

	if err := handlers.ValidateRating(payload); err == nil {
		t.Errorf("ValidateRating esperaba error para valor 0, se obtuvo nil")
	}
}

// UT-GO-07: TestValidarCalificacion_Valor6_RetornaError verifica frontera superior inválida (BVA: valor = 6).
// Satisface: RF-06, VyV §3.1.
func TestValidarCalificacion_Valor6_RetornaError(t *testing.T) {
	payload := handlers.RatingPayload{
		ProductID: "prod-12345",
		Value:     6,
	}

	if err := handlers.ValidateRating(payload); err == nil {
		t.Errorf("ValidateRating esperaba error para valor 6, se obtuvo nil")
	}
}

// TestValidarCalificacion_ProductoIDVacio_RetornaError verifica que una calificación sin ProductID sea rechazada.
func TestValidarCalificacion_ProductoIDVacio_RetornaError(t *testing.T) {
	payload := handlers.RatingPayload{
		ProductID: "",
		Value:     4,
	}

	if err := handlers.ValidateRating(payload); err == nil {
		t.Errorf("ValidateRating esperaba error para productId vacío, se obtuvo nil")
	}
}

// UT-GO-08: TestValidarBusqueda_QueryValida_RetornaNil verifica que un término de búsqueda válido retorne nil.
// Satisface: RF-18, VyV §3.1.
func TestValidarBusqueda_QueryValida_RetornaNil(t *testing.T) {
	validQueries := []string{"libro", "novela gráfica", "lector pobre", "123", "pin acrílico"}

	for _, q := range validQueries {
		if err := handlers.ValidateSearch(q); err != nil {
			t.Errorf("ValidateSearch esperaba nil para query %q, se obtuvo: %v", q, err)
		}
		if err := handlers.ValidarBusqueda(q); err != nil {
			t.Errorf("ValidarBusqueda (alias) esperaba nil para query %q, se obtuvo: %v", q, err)
		}
	}
}

// UT-GO-09: TestValidarBusqueda_QueryVacia_RetornaError verifica que una consulta vacía retorne error.
// Satisface: RF-18, VyV §3.1.
func TestValidarBusqueda_QueryVacia_RetornaError(t *testing.T) {
	emptyQueries := []string{"", "   ", "\t"}

	for _, q := range emptyQueries {
		if err := handlers.ValidateSearch(q); err == nil {
			t.Errorf("ValidateSearch esperaba error para query vacía %q, se obtuvo nil", q)
		}
	}
}

// UT-GO-10: TestValidarBusqueda_QueryConInyeccionGROQ_RetornaError verifica que metacaracteres de GROQ sean detectados y rechazados.
// Satisface: RF-18, RNF-04, VyV §3.1.
func TestValidarBusqueda_QueryConInyeccionGROQ_RetornaError(t *testing.T) {
	injectionQueries := []string{
		`*[tipo=="prod"]`,
		`*[_type=="categoria"]`,
		`libro" || 1==1`,
		`{_id, nombre}`,
		`libro | order(_createdAt desc)`,
		`libro\`,
		`$param`,
		`[0..10]`,
	}

	for _, q := range injectionQueries {
		if err := handlers.ValidateSearch(q); err == nil {
			t.Errorf("ValidateSearch esperaba error por inyección GROQ para query %q, se obtuvo nil", q)
		}
	}
}

// TestValidarBusqueda_QueryExcedeLongitud_RetornaError verifica que consultas mayores a 200 caracteres sean rechazadas.
func TestValidarBusqueda_QueryExcedeLongitud_RetornaError(t *testing.T) {
	longQuery := strings.Repeat("a", 201)
	if err := handlers.ValidateSearch(longQuery); err == nil {
		t.Errorf("ValidateSearch esperaba error para query que excede 200 caracteres")
	}
}

