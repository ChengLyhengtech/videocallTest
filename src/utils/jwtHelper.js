/**
 * Decodes a JWT token without verifying signature (for client inspection)
 */
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length < 2) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('Failed to parse JWT payload', err);
    return null;
  }
}

/**
 * Extracts a recognizable user identifier from JWT claims
 */
export function extractUserIdFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  // Standard ASP.NET Core ClaimTypes:
  // "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier" -> ClaimTypes.NameIdentifier
  // "sub" -> standard subject
  // "name" / "unique_name" / "id"
  return (
    payload.sub ||
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    payload.unique_name ||
    payload.nameid ||
    payload.userId ||
    payload.email ||
    payload.name ||
    null
  );
}

/**
 * Generates an unsigned Mock JWT for local development testing
 * Format: base64(header).base64(payload).mockSignature
 */
export function generateMockJwt(userId = 'user_alice', role = 'User') {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': userId,
    unique_name: userId,
    name: userId,
    role: role,
    nbf: now,
    iat: now,
    exp: now + 86400 * 7 // 7 days
  };

  const b64Url = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  return `${b64Url(header)}.${b64Url(payload)}.mock_dev_signature_for_testing`;
}
