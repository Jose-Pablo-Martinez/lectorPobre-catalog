package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"testing"
	"time"
)

// UT-GO-24: TestHMAC_FirmaCorrecta_RetornaTrue verifica que una firma válida en hex retorne true.
// Satisface: Arquitectura §9.10, RNF-04.
func TestHMAC_FirmaCorrecta_RetornaTrue(t *testing.T) {
	payload := []byte(`{"_type":"producto","nombre":"Llavero Acrílico"}`)
	secret := "secreto-super-seguro-12345" // gitleaks:allow

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	validSignature := hex.EncodeToString(mac.Sum(nil))

	if !VerifyHMAC(payload, validSignature, secret) {
		t.Errorf("VerifyHMAC esperada true para firma válida en hex, se obtuvo false")
	}
}

// TestHMAC_FirmaBase64_RetornaTrue verifica que una firma directa en base64 sea aceptada.
func TestHMAC_FirmaBase64_RetornaTrue(t *testing.T) {
	payload := []byte(`{"_type":"producto","nombre":"Llavero Acrílico"}`)
	secret := "secreto-super-seguro-12345" // gitleaks:allow

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	validB64 := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	if !VerifyHMAC(payload, validB64, secret) {
		t.Errorf("VerifyHMAC esperada true para firma válida en base64, se obtuvo false")
	}
}

// UT-GO-25: TestHMAC_FirmaIncorrecta_RetornaFalse verifica que una firma alterada o con secreto erróneo retorne false.
// Satisface: Arquitectura §9.10, RNF-04.
func TestHMAC_FirmaIncorrecta_RetornaFalse(t *testing.T) {
	payload := []byte(`{"_type":"producto","nombre":"Llavero Acrílico"}`)
	secret := "secreto-super-seguro-12345" // gitleaks:allow
	wrongSecret := "secreto-incorrecto"

	mac := hmac.New(sha256.New, []byte(wrongSecret))
	mac.Write(payload)
	invalidSignature := hex.EncodeToString(mac.Sum(nil))

	if VerifyHMAC(payload, invalidSignature, secret) {
		t.Errorf("VerifyHMAC esperada false para firma generada con secreto incorrecto, se obtuvo true")
	}
}

// UT-GO-26: TestHMAC_FirmaVacia_RetornaFalse verifica que una firma vacía o nula sea rechazada inmediatamente.
// Satisface: Arquitectura §9.10, RNF-04.
func TestHMAC_FirmaVacia_RetornaFalse(t *testing.T) {
	payload := []byte(`{"_type":"producto"}`)
	secret := "secreto-12345" // gitleaks:allow

	if VerifyHMAC(payload, "", secret) {
		t.Errorf("VerifyHMAC esperada false para firma vacía")
	}

	if VerifyHMAC(payload, "firma", "") {
		t.Errorf("VerifyHMAC esperada false para secreto vacío")
	}
}

// TestHMAC_FormatoSanity_RetornaTrue valida el formato estándar de cabecera Sanity "t=<timestamp>,v1=<hash>".
func TestHMAC_FormatoSanity_RetornaTrue(t *testing.T) {
	payload := []byte(`{"_type":"producto","slug":"pin-pobre"}`)
	secret := "cb3539ce482b2b0034e10ae9953edaeded73c21f996ea38d741ecc75e2903849" // gitleaks:allow
	timestamp := fmt.Sprintf("%d", time.Now().Unix())

	signedContent := append([]byte(timestamp+"."), payload...)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(signedContent)
	signatureHex := hex.EncodeToString(mac.Sum(nil))

	header := fmt.Sprintf("t=%s,v1=%s", timestamp, signatureHex)

	if !VerifyHMAC(payload, header, secret) {
		t.Errorf("VerifyHMAC esperada true para formato de cabecera Sanity 't=...,v1=...'")
	}
}

// TestHMAC_FormatoSanity_SinTimestamp_RetornaTrue valida Sanity sin componente 't='.
func TestHMAC_FormatoSanity_SinTimestamp_RetornaTrue(t *testing.T) {
	payload := []byte(`{"_type":"producto","slug":"pin-pobre"}`)
	secret := "secreto-123"

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	signatureHex := hex.EncodeToString(mac.Sum(nil))

	header := fmt.Sprintf("v1=%s", signatureHex)

	if !VerifyHMAC(payload, header, secret) {
		t.Errorf("VerifyHMAC esperada true para 'v1=...' sin timestamp")
	}
}

// TestHMAC_FormatoSanity_FirmaInvalida_RetornaFalse valida Sanity con firma incorrecta.
func TestHMAC_FormatoSanity_FirmaInvalida_RetornaFalse(t *testing.T) {
	payload := []byte(`{"_type":"producto"}`)
	secret := "secreto-123"

	header := "t=1700000000,v1=firma-falsa"

	if VerifyHMAC(payload, header, secret) {
		t.Errorf("VerifyHMAC esperada false para Sanity con firma falsa")
	}
}

// TestHMAC_FormatoSanity_V1Vacio_RetornaFalse valida cuando v1 está vacío.
func TestHMAC_FormatoSanity_V1Vacio_RetornaFalse(t *testing.T) {
	payload := []byte(`{"_type":"producto"}`)
	secret := "secreto-123"

	if VerifyHMAC(payload, "t=1700000000,v1=", secret) {
		t.Errorf("VerifyHMAC esperada false para 'v1=' vacío")
	}
}
