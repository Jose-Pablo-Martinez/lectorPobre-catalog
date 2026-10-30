package handlers_test

import (
	"encoding/json"
	"testing"

	"github.com/tu-org/lectorpobre/pkg/handlers"
)

// TestCommentPayload_UnmarshalJSON_EspanolEIngles verifica la deserialización en ambos idiomas.
func TestCommentPayload_UnmarshalJSON_EspanolEIngles(t *testing.T) {
	// Caso 1: JSON en español
	dataEs := []byte(`{"productoId":"prod-es","texto":"Texto en español"}`)
	var payloadEs handlers.CommentPayload
	if err := json.Unmarshal(dataEs, &payloadEs); err != nil {
		t.Fatalf("Error al deserializar español: %v", err)
	}
	if payloadEs.ProductID != "prod-es" || payloadEs.Text != "Texto en español" {
		t.Errorf("Error mapeando español: pid=%s text=%s", payloadEs.ProductID, payloadEs.Text)
	}

	// Caso 2: JSON en inglés
	dataEn := []byte(`{"productId":"prod-en","text":"Text in english"}`)
	var payloadEn handlers.CommentPayload
	if err := json.Unmarshal(dataEn, &payloadEn); err != nil {
		t.Fatalf("Error al deserializar inglés: %v", err)
	}
	if payloadEn.ProductID != "prod-en" || payloadEn.Text != "Text in english" {
		t.Errorf("Error mapeando inglés: pid=%s text=%s", payloadEn.ProductID, payloadEn.Text)
	}

	// Caso 3: JSON inválido
	var payloadErr handlers.CommentPayload
	if err := json.Unmarshal([]byte(`{invalido`), &payloadErr); err == nil {
		t.Errorf("Esperaba error al deserializar JSON malformado")
	}
}

// TestRatingPayload_UnmarshalJSON_EspanolEIngles verifica la deserialización de calificaciones.
func TestRatingPayload_UnmarshalJSON_EspanolEIngles(t *testing.T) {
	// Caso 1: JSON en español
	dataEs := []byte(`{"productoId":"prod-cal-es","valor":5}`)
	var payloadEs handlers.RatingPayload
	if err := json.Unmarshal(dataEs, &payloadEs); err != nil {
		t.Fatalf("Error al deserializar calificación español: %v", err)
	}
	if payloadEs.ProductID != "prod-cal-es" || payloadEs.Value != 5 {
		t.Errorf("Error mapeando calificación español: pid=%s valor=%d", payloadEs.ProductID, payloadEs.Value)
	}

	// Caso 2: JSON en inglés
	dataEn := []byte(`{"productId":"prod-cal-en","value":4}`)
	var payloadEn handlers.RatingPayload
	if err := json.Unmarshal(dataEn, &payloadEn); err != nil {
		t.Fatalf("Error al deserializar calificación inglés: %v", err)
	}
	if payloadEn.ProductID != "prod-cal-en" || payloadEn.Value != 4 {
		t.Errorf("Error mapeando calificación inglés: pid=%s valor=%d", payloadEn.ProductID, payloadEn.Value)
	}

	// Caso 3: JSON inválido
	var payloadErr handlers.RatingPayload
	if err := json.Unmarshal([]byte(`{invalido`), &payloadErr); err == nil {
		t.Errorf("Esperaba error al deserializar JSON malformado")
	}
}

