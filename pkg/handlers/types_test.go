package handlers_test

import (
	"encoding/json"
	"testing"

	"github.com/tu-org/lectorpobre/pkg/handlers"
)

// TestCommentPayload_UnmarshalJSON_EspanolEIngles verifica la deserialización en ambos idiomas.
func TestCommentPayload_UnmarshalJSON_EspanolEIngles(t *testing.T) {
	// Caso 1: JSON en español incluyendo calificación y usuarioId
	dataEs := []byte(`{"productoId":"prod-es","texto":"Texto en español","calificacion":4,"usuarioId":"usr-123"}`)
	var payloadEs handlers.CommentPayload
	if err := json.Unmarshal(dataEs, &payloadEs); err != nil {
		t.Fatalf("Error al deserializar español: %v", err)
	}
	if payloadEs.ProductID != "prod-es" || payloadEs.Text != "Texto en español" || payloadEs.Rating != 4 || payloadEs.UserID != "usr-123" {
		t.Errorf("Error mapeando español: %+v", payloadEs)
	}

	// Caso 2: JSON en inglés
	dataEn := []byte(`{"productId":"prod-en","text":"Text in english","rating":5,"userId":"usr-456"}`)
	var payloadEn handlers.CommentPayload
	if err := json.Unmarshal(dataEn, &payloadEn); err != nil {
		t.Fatalf("Error al deserializar inglés: %v", err)
	}
	if payloadEn.ProductID != "prod-en" || payloadEn.Text != "Text in english" || payloadEn.Rating != 5 || payloadEn.UserID != "usr-456" {
		t.Errorf("Error mapeando inglés: %+v", payloadEn)
	}

	// Caso 3: JSON inválido
	var payloadErr handlers.CommentPayload
	if err := json.Unmarshal([]byte(`{invalido`), &payloadErr); err == nil {
		t.Errorf("Esperaba error al deserializar JSON malformado")
	}
}

// TestRatingPayload_UnmarshalJSON_EspanolEIngles verifica la deserialización de calificaciones.
func TestRatingPayload_UnmarshalJSON_EspanolEIngles(t *testing.T) {
	// Caso 1: JSON en español incluyendo valorPrevio y usuarioId
	dataEs := []byte(`{"productoId":"prod-cal-es","valor":5,"valorPrevio":3,"usuarioId":"usr-es"}`)
	var payloadEs handlers.RatingPayload
	if err := json.Unmarshal(dataEs, &payloadEs); err != nil {
		t.Fatalf("Error al deserializar calificación español: %v", err)
	}
	if payloadEs.ProductID != "prod-cal-es" || payloadEs.Value != 5 || payloadEs.PreviousValue != 3 || payloadEs.UserID != "usr-es" {
		t.Errorf("Error mapeando calificación español: %+v", payloadEs)
	}

	// Caso 2: JSON en inglés
	dataEn := []byte(`{"productId":"prod-cal-en","value":4,"previousValue":2,"userId":"usr-en"}`)
	var payloadEn handlers.RatingPayload
	if err := json.Unmarshal(dataEn, &payloadEn); err != nil {
		t.Fatalf("Error al deserializar calificación inglés: %v", err)
	}
	if payloadEn.ProductID != "prod-cal-en" || payloadEn.Value != 4 || payloadEn.PreviousValue != 2 || payloadEn.UserID != "usr-en" {
		t.Errorf("Error mapeando calificación inglés: %+v", payloadEn)
	}

	// Caso 3: JSON inválido
	var payloadErr handlers.RatingPayload
	if err := json.Unmarshal([]byte(`{invalido`), &payloadErr); err == nil {
		t.Errorf("Esperaba error al deserializar JSON malformado")
	}
}
