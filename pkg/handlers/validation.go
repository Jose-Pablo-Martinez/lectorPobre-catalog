// Package handlers implementa la validación de entradas para todos los handlers serverless de LectorPobre.
// Todas las funciones públicas de este archivo están cubiertas por los tests unitarios UT-GO-01 a UT-GO-10.
// Satisface: RF-06 (Calificaciones), RF-07 (Comentarios), RF-18 (Búsqueda), RNF-04 (Sanitización de entradas, prevención GROQ §9.11).
package handlers

import (
	"errors"
	"strings"
	"unicode/utf8"
)

// groqBannedCharacters define los metacaracteres reservados de sintaxis GROQ
// cuyo uso en queries libres de usuario puede alterar la lógica de la consulta (§9.11).
const groqBannedCharacters = "*[]{}\"\\|$"

// ValidateComment valida los campos de un CommentPayload.
// Retorna un error descriptivo si la validación falla, o nil si el payload es válido.
// Probado por: UT-GO-01 a UT-GO-04 (VyV_LectorPobre.md §3.1).
func ValidateComment(p CommentPayload) error {
	if strings.TrimSpace(p.ProductID) == "" {
		return errors.New("productoId requerido")
	}
	if strings.TrimSpace(p.Text) == "" {
		return errors.New("texto no puede estar vacío")
	}
	if utf8.RuneCountInString(p.Text) > 1000 {
		return errors.New("el texto no puede exceder 1000 caracteres")
	}
	return nil
}

// ValidarComentario es un alias en español para ValidateComment para compatibilidad.
func ValidarComentario(p CommentPayload) error {
	return ValidateComment(p)
}

// ValidateRating valida los campos de un RatingPayload.
// Retorna un error descriptivo si el valor de la calificación está fuera del rango [1, 5]
// o si falta el ProductID.
// Probado por: UT-GO-05 a UT-GO-07 (VyV_LectorPobre.md §3.1).
// Fronteras de análisis de valor límite (BVA): válido=[1,5], inválido=[0,6] — ver VyV UT-GO-06, UT-GO-07.
func ValidateRating(p RatingPayload) error {
	if strings.TrimSpace(p.ProductID) == "" {
		return errors.New("productoId requerido")
	}
	if p.Value < 1 || p.Value > 5 {
		return errors.New("calificación fuera de rango [1, 5]")
	}
	return nil
}

// ValidarCalificacion es un alias en español para ValidateRating para compatibilidad.
func ValidarCalificacion(p RatingPayload) error {
	return ValidateRating(p)
}

// ValidateSearch valida y sanitiza una cadena de consulta de búsqueda.
// Retorna un error si la consulta está vacía o contiene metacaracteres de inyección GROQ (§9.11).
// Probado por: UT-GO-08 a UT-GO-10 (VyV_LectorPobre.md §3.1).
func ValidateSearch(q string) error {
	trimmed := strings.TrimSpace(q)
	if trimmed == "" {
		return errors.New("query no puede estar vacía")
	}
	if strings.ContainsAny(trimmed, groqBannedCharacters) {
		return errors.New("la consulta contiene metacaracteres no permitidos para prevenir inyección GROQ")
	}
	if utf8.RuneCountInString(trimmed) > 200 {
		return errors.New("la consulta excede la longitud máxima permitida")
	}
	return nil
}

// ValidarBusqueda es un alias en español para ValidateSearch para compatibilidad.
func ValidarBusqueda(q string) error {
	return ValidateSearch(q)
}
