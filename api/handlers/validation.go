// Package handlers implements input validation for all LectorPobre serverless handlers.
// All public functions in this file are covered by unit tests UT-GO-01 to UT-GO-10.
// TODO(Phase 5): Implement full validation logic. Issue #10.
// Satisfies: RF-06, RF-07, RF-18, RNF-04 (input sanitization).
package handlers

import "errors"

// ValidateComment validates the fields of a CommentPayload.
// Returns a descriptive error if validation fails, or nil if the payload is valid.
// Tested by: UT-GO-01 to UT-GO-04 (VyV_LectorPobre.md §3.1).
func ValidateComment(p CommentPayload) error {
	// TODO(RF-07): Implement — check empty text, max 1000 chars, non-empty productId.
	return errors.New("not implemented")
}

// ValidateRating validates the fields of a RatingPayload.
// Returns a descriptive error if the rating value is outside the [1, 5] range.
// Tested by: UT-GO-05 to UT-GO-07 (VyV_LectorPobre.md §3.1).
// BVA boundary: valid=[1,5], invalid=[0,6] — see VyV UT-GO-06, UT-GO-07.
func ValidateRating(p RatingPayload) error {
	// TODO(RF-06): Implement — check value in range [1, 5].
	return errors.New("not implemented")
}

// ValidateSearch validates and sanitizes a search query string.
// Returns an error if the query is empty or contains GROQ metacharacters (§9.11).
// Tested by: UT-GO-08 to UT-GO-10 (VyV_LectorPobre.md §3.1).
func ValidateSearch(q string) error {
	// TODO(RF-18): Implement — check non-empty, sanitize GROQ injection characters.
	return errors.New("not implemented")
}
