// Package handlers implementa la validación de entradas para todos los handlers serverless de LectorPobre.
// Todas las funciones públicas de este archivo están cubiertas por los tests unitarios UT-GO-01 a UT-GO-10.
// TODO(Fase 5): Implementar la lógica completa de validación. Issue #10.
// Satisface: RF-06, RF-07, RF-18, RNF-04 (sanitización de entradas).
package handlers

import "errors"

// ValidateComment valida los campos de un CommentPayload.
// Retorna un error descriptivo si la validación falla, o nil si el payload es válido.
// Probado por: UT-GO-01 a UT-GO-04 (VyV_LectorPobre.md §3.1).
func ValidateComment(p CommentPayload) error {
	// TODO(RF-07): Implementar — verificar texto no vacío, máximo 1000 caracteres y productId no vacío.
	return errors.New("not implemented")
}

// ValidateRating valida los campos de un RatingPayload.
// Retorna un error descriptivo si el valor de la calificación está fuera del rango [1, 5].
// Probado por: UT-GO-05 a UT-GO-07 (VyV_LectorPobre.md §3.1).
// Fronteras de análisis de valor límite (BVA): válido=[1,5], inválido=[0,6] — ver VyV UT-GO-06, UT-GO-07.
func ValidateRating(p RatingPayload) error {
	// TODO(RF-06): Implementar — verificar que el valor se encuentre en el rango [1, 5].
	return errors.New("not implemented")
}

// ValidateSearch valida y sanitiza una cadena de consulta de búsqueda.
// Retorna un error si la consulta está vacía o contiene metacaracteres de GROQ (§9.11).
// Probado por: UT-GO-08 a UT-GO-10 (VyV_LectorPobre.md §3.1).
func ValidateSearch(q string) error {
	// TODO(RF-18): Implementar — verificar no vacío, sanitizar caracteres de inyección GROQ.
	return errors.New("not implemented")
}
