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
func VerifyHMAC(payload []byte, signature string, secret string) bool {
	if signature == "" || secret == "" {
		return false
	}

	secretBytes := []byte(secret)

	// Manejo del formato de cabecera de Sanity: "t=<timestamp>,v1=<hash>"
	if strings.Contains(signature, "v1=") {
		parts := strings.Split(signature, ",")
		var timestamp, v1Sig string
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if strings.HasPrefix(part, "t=") {
				timestamp = strings.TrimPrefix(part, "t=")
			} else if strings.HasPrefix(part, "v1=") {
				v1Sig = strings.TrimPrefix(part, "v1=")
			}
		}

		if v1Sig != "" {
			// En la especificación de Sanity, el contenido firmado es: timestamp + "." + payload
			var signedPayload []byte
			if timestamp != "" {
				signedPayload = append([]byte(timestamp+"."), payload...)
			} else {
				signedPayload = payload
			}

			mac := hmac.New(sha256.New, secretBytes)
			mac.Write(signedPayload)
			expectedMAC := mac.Sum(nil)

			expectedHex := hex.EncodeToString(expectedMAC)
			expectedB64 := base64.StdEncoding.EncodeToString(expectedMAC)

			if hmac.Equal([]byte(v1Sig), []byte(expectedHex)) || hmac.Equal([]byte(v1Sig), []byte(expectedB64)) {
				return true
			}
		}
	}

	// Firma directa sobre el payload bruto (hex o base64)
	mac := hmac.New(sha256.New, secretBytes)
	mac.Write(payload)
	expectedMAC := mac.Sum(nil)

	expectedHex := hex.EncodeToString(expectedMAC)
	expectedB64 := base64.StdEncoding.EncodeToString(expectedMAC)

	if hmac.Equal([]byte(signature), []byte(expectedHex)) || hmac.Equal([]byte(signature), []byte(expectedB64)) {
		return true
	}

	return false
}
