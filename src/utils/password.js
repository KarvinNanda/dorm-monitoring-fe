// Rules for a NEW password (create user, reset by admin, change own).
// Same rules as the backend IsNewPassword() in src/common/validation/password.ts:
// - MinLength(8) from class-validator counts characters, an emoji counts as 1.
// - IsByteLength(0, 72) counts UTF-8 bytes: bcrypt only reads 72 bytes, so the
//   backend rejects anything longer instead of silently cutting it off.
// Login does not use these rules (old, longer passwords must still work).
export const PASSWORD_MIN_CHARS = 8
export const PASSWORD_MAX_BYTES = 72

// Same counting as validator.js isLength(): surrogate pairs and variation
// selectors do not add to the length.
function passwordLength(pw) {
  const surrogatePairs = pw.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []
  const variationSelectors = pw.match(/[︎️]/g) || []
  return pw.length - surrogatePairs.length - variationSelectors.length
}

export function passwordByteLength(pw) {
  return new TextEncoder().encode(pw).length
}

/** Returns an Indonesian error message, or '' when the password is valid. */
export function newPasswordError(pw) {
  if (!pw || passwordLength(pw) < PASSWORD_MIN_CHARS) {
    return `Kata sandi minimal ${PASSWORD_MIN_CHARS} karakter`
  }
  if (passwordByteLength(pw) > PASSWORD_MAX_BYTES) {
    return `Kata sandi maksimal ${PASSWORD_MAX_BYTES} karakter (huruf khusus dan emoji dihitung lebih dari 1)`
  }
  return ''
}
