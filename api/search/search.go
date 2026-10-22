// Package handler implementa la función serverless para búsqueda de productos.
package handler

import "net/http"

// TODO(RF-18): Implementar consulta parametrizada GROQ y sanitización. Issue #7.
// NOTA: La búsqueda en el cliente en Nuxt (Fase 3) cubre la gran mayoría de casos de uso.
// Esta función serverless se activa únicamente si el catálogo supera los umbrales de hidratación.

// Handler procesa la solicitud de búsqueda.
//
// Satisface: RF-18 (Búsqueda), RNF-04 (Prevención de inyecciones GROQ).
// Endpoint: GET /api/search
func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	w.Write([]byte(`{"error":"not implemented"}`))
}
