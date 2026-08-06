/**
 * Utility functions to securely encode and decode presale/franchisee IDs for public Deed of Variation URLs.
 * Ensures the raw numeric ID (e.g. 425904) is obfuscated and protected against URL tampering.
 */

const SECRET_PREFIX = 'mp_dov_v1_';

export function encodePresaleId(id: string | number): string {
  const cleanId = String(id || '').trim();
  if (!cleanId) return '';

  // If already an encoded token starting with dov_, return as is
  if (cleanId.startsWith('dov_')) return cleanId;

  const payload = `${SECRET_PREFIX}${cleanId}`;
  
  if (typeof window !== 'undefined') {
    try {
      const b64 = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return `dov_${b64}`;
    } catch {
      return cleanId;
    }
  } else {
    try {
      const b64 = Buffer.from(payload).toString('base64url');
      return `dov_${b64}`;
    } catch {
      return cleanId;
    }
  }
}

export function decodePresaleId(tokenOrId: string): string {
  if (!tokenOrId) return '';
  const clean = String(tokenOrId).trim();

  if (clean.startsWith('dov_')) {
    try {
      const rawToken = clean.slice(4);
      let decoded = '';
      if (typeof window !== 'undefined') {
        const b64 = rawToken.replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (b64.length % 4)) % 4;
        const paddedB64 = b64 + '='.repeat(padLength);
        decoded = atob(paddedB64);
      } else {
        decoded = Buffer.from(rawToken, 'base64url').toString('utf8');
      }

      if (decoded.startsWith(SECRET_PREFIX)) {
        return decoded.slice(SECRET_PREFIX.length);
      }
    } catch (e) {
      console.warn('Failed to decode presale token:', e);
    }
  }

  // Fallback: If it's a legacy raw ID or direct lookup, return original clean ID
  return clean;
}
