// Package middleware implementa los controles de seguridad HTTP para las funciones serverless de LectorPobre.
// Satisface: RNF-04 (Verificación de firma HMAC en webhooks — §9.10).
// TODO(Fase 5): Implementar la verificación HMAC completa. Issue #13.
package middleware

// VerifyHMAC verifica la firma HMAC-SHA256 de una carga útil de webhook entrante.
// La firma se espera en el encabezado "Sanity-Webhook-Signature".
// Retorna true únicamente si la firma calculada coincide con la proporcionada.
// Probado por: UT-GO-24 (válida), UT-GO-25 (inválida), UT-GO-26 (vacía) — VyV §3.3.
func VerifyHMAC(payload []byte, signature string, secret string) bool {
	// TODO(RNF-04, §9.10): Implementar — calcular HMAC-SHA256(payload, secret),
	// comparar con la firma recibida usando crypto/hmac.Equal para prevenir ataques de temporización.
	// Retornar false de inmediato si la firma está vacía.
	return false
}
