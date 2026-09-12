// Package middleware implements HTTP security controls for LectorPobre serverless functions.
// Satisfies: RNF-04 (HMAC webhook signature verification — §9.10).
// TODO(Phase 5): Implement full HMAC verification. Issue #13.
package middleware

// VerifyHMAC verifies the HMAC-SHA256 signature of an incoming webhook payload.
// The signature is expected in the "Sanity-Webhook-Signature" header.
// Returns true only if the computed signature matches the provided one.
// Tested by: UT-GO-24 (valid), UT-GO-25 (invalid), UT-GO-26 (empty) — VyV §3.3.
func VerifyHMAC(payload []byte, signature string, secret string) bool {
	// TODO(RNF-04, §9.10): Implement — compute HMAC-SHA256(payload, secret),
	// compare with provided signature using crypto/hmac.Equal to prevent timing attacks.
	// Return false immediately if signature is empty.
	return false
}
