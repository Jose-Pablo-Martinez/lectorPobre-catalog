// Package handler implementa la función serverless para búsqueda de productos.
// Satisface: RF-18 (Búsqueda por palabra clave con GROQ parametrizado),
// RNF-04 (Sanitización de entradas, prevención de inyecciones GROQ §9.11 y CORS restrictivo).
package handler

import (
	"log"
	"net/http"

	"github.com/tu-org/lectorpobre/pkg/constants"
	"github.com/tu-org/lectorpobre/pkg/handlers"
	"github.com/tu-org/lectorpobre/pkg/middleware"
	"github.com/tu-org/lectorpobre/pkg/sanity"
)

var defaultSanitySearcher sanity.Searcher

// SetSanitySearcher permite inyectar un mock de sanity.Searcher para pruebas unitarias.
func SetSanitySearcher(s sanity.Searcher) {
	defaultSanitySearcher = s
}

func getSanitySearcher() (sanity.Searcher, error) {
	if defaultSanitySearcher != nil {
		return defaultSanitySearcher, nil
	}
	return sanity.NewClient()
}

// Handler procesa la solicitud de búsqueda de productos.
// Endpoint: GET /api/search (y /api/buscar?q=...)
//
// Retorna:
//   - 200 OK con la lista de productos encontrados en data.
//   - 400 Bad Request si la consulta está vacía o contiene metacaracteres de inyección GROQ.
//   - 403 Forbidden si el Origin no está autorizado por CORS.
//   - 405 Method Not Allowed si el método HTTP no es GET.
//   - 429 Too Many Requests si se supera el rate limit por IP.
//   - 500 Internal Server Error si falla la comunicación con Sanity.
func Handler(w http.ResponseWriter, r *http.Request) {
	// 1. Guard contra panics: asegura que nunca se expongan trazas de ejecución (RNF-04, UT-GO-18)
	defer func() {
		if rec := recover(); rec != nil {
			log.Printf("[PANIC RECOVERED] SearchHandler: %v", rec)
			handlers.SendInternalError(w)
		}
	}()

	// 2. Control CORS restrictivo (§9.4, UT-GO-19..21)
	if !middleware.ApplyCORS(w, r) {
		return
	}

	// 3. Verificación de método HTTP (solo GET permitido)
	if r.Method != http.MethodGet {
		handlers.SendError(w, http.StatusMethodNotAllowed, "método no permitido", constants.ErrCodes.Unauthorized)
		return
	}

	// 4. Rate limiting por IP (§9.5, UT-GO-22..23)
	if !middleware.VerificarRateLimit(r, "buscar") {
		handlers.SendError(w, http.StatusTooManyRequests, "demasiadas solicitudes", constants.ErrCodes.RateLimit)
		return
	}

	// 5. Extracción y validación de parámetro de búsqueda q (§9.11, UT-GO-08..10)
	query := r.URL.Query().Get("q")
	if err := handlers.ValidateSearch(query); err != nil {
		handlers.SendError(w, http.StatusBadRequest, err.Error(), constants.ErrCodes.InvalidQuery)
		return
	}

	// 6. Consulta parametrizada a Sanity evitando inyección GROQ (RF-18, RNF-04)
	searcher, err := getSanitySearcher()
	if err != nil {
		log.Printf("[ERROR] SearchHandler: error al inicializar cliente Sanity: %v", err)
		handlers.SendInternalError(w)
		return
	}

	results, err := searcher.SearchProducts(r.Context(), query)
	if err != nil {
		log.Printf("[ERROR] SearchHandler: error al consultar Sanity: %v", err)
		handlers.SendInternalError(w)
		return
	}

	// 7. Respuesta exitosa HTTP 200 OK (UT-GO-17)
	handlers.SendSuccess(w, http.StatusOK, results)
}
