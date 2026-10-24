// Package middleware implementa los controles de seguridad HTTP para las funciones serverless de LectorPobre.
// Satisface: RNF-04 (Verificación de firma HMAC en webhooks — §9.10).
package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strings"
)

// VerifyHMAC verifica la firma HMAC-SHA256 de una carga útil de webhook entrante.
// La firma se espera en el encabezado "Sanity-Webhook-Signature".
// Soporta firmas directas (hex/base64) y el formato estándar de Sanity (t=<timestamp>,v1=<hash>).
// Retorna true únicamente si la firma calculada coincide con la proporcionada usando crypto/hmac.Equal
// para mitigar ataques de temporización (timing attacks).
// Probado por: UT-GO-24 (válida), UT-GO-25 (inválida), UT-GO-26 (vacía) — VyV §3.3.
func VerifyHMAC(payload []byte, signature, secret string) bool {
	if signature == "" || secret == "" {
		return false
	}

	secretBytes := []byte(secret)

	if strings.Contains(signature, "v1=") {
		return verifySanityTimestamped(payload, signature, secretBytes)
	}

	return verifyDirectPayload(payload, signature, secretBytes)
}

// verifySanityTimestamped verifica el formato oficial de Sanity "t=<timestamp>,v1=<hash>".
func verifySanityTimestamped(payload []byte, header string, secretBytes []byte) bool {
	timestamp, v1Sig := parseSanityHeader(header)
	if v1Sig == "" {
		return false
	}

	signedPayload := payload
	if timestamp != "" {
		signedPayload = append([]byte(timestamp+"."), payload...)
	}

	expectedMAC := computeHMAC(signedPayload, secretBytes)
	return compareSignature(expectedMAC, v1Sig)
}

// verifyDirectPayload verifica firmas aplicadas directamente sobre el cuerpo del payload (hex o base64).
func verifyDirectPayload(payload []byte, signature string, secretBytes []byte) bool {
	expectedMAC := computeHMAC(payload, secretBytes)
	return compareSignature(expectedMAC, signature)
}

// parseSanityHeader descompone la cabecera "t=...,v1=..." en sus componentes individuales.
func parseSanityHeader(header string) (string, string) {
	var timestamp, v1Sig string
	for _, part := range strings.Split(header, ",") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "t=") {
			timestamp = strings.TrimPrefix(part, "t=")
		} else if strings.HasPrefix(part, "v1=") {
			v1Sig = strings.TrimPrefix(part, "v1=")
		}
	}
	return timestamp, v1Sig
}

// computeHMAC genera el resumen HMAC-SHA256 del contenido usando el secreto provisto.
func computeHMAC(content, secret []byte) []byte {
	mac := hmac.New(sha256.New, secret)
	mac.Write(content)
	return mac.Sum(nil)
}

// compareSignature compara de forma segura contra timing attacks una firma provista con el resumen esperado.
// Sanity firma usando HMAC-SHA256 en Base64 URL-safe sin relleno (RFC 4648 §5 / base64.RawURLEncoding).
// Por robustez, se evalúan variantes de codificación válidas (RawURLEncoding, URLEncoding, Hex y StdEncoding).
func compareSignature(expectedMAC []byte, providedSig string) bool {
	formats := []string{
		base64.RawURLEncoding.EncodeToString(expectedMAC),
		base64.URLEncoding.EncodeToString(expectedMAC),
		hex.EncodeToString(expectedMAC),
		base64.StdEncoding.EncodeToString(expectedMAC),
	}

	for _, expected := range formats {
		if hmac.Equal([]byte(providedSig), []byte(expected)) {
			return true
		}
	}

	return false
}

