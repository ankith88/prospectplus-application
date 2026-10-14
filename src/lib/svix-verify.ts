import crypto from 'crypto';

interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/**
 * Verifies Svix webhook signatures using native Node.js crypto.
 * https://docs.svix.com/receiving/verifying-payloads/how
 */
export function verifySvixSignature(
  rawPayload: string,
  headers: SvixHeaders,
  secret: string
): boolean {
  if (!secret) return false;
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  try {
    // 1. Check timestamp tolerance (within 5 minutes = 300 seconds)
    const timestampSec = parseInt(headers.timestamp, 10);
    if (isNaN(timestampSec)) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > 300) {
      console.warn('[Svix Webhook] Timestamp outside 5-minute tolerance window');
      return false;
    }

    // 2. Format secret (strip 'whsec_' prefix if present and base64 decode)
    const rawSecret = secret.startsWith('whsec_') ? secret.substring(6) : secret;
    const key = Buffer.from(rawSecret, 'base64');

    // 3. Compute HMAC SHA-256 over `${id}.${timestamp}.${rawPayload}`
    const toSign = `${headers.id}.${headers.timestamp}.${rawPayload}`;
    const expectedSig = crypto
      .createHmac('sha256', key)
      .update(toSign)
      .digest('base64');

    // 4. Compare with passed signatures (which may contain multiple space-separated v1,... signatures)
    const passedSigs = headers.signature.split(' ');
    for (const item of passedSigs) {
      const [version, signature] = item.split(',');
      if (version === 'v1' && signature) {
        // Use timingSafeEqual to avoid timing attacks
        const expectedBuf = Buffer.from(expectedSig);
        const actualBuf = Buffer.from(signature);
        if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
          return true;
        }
      }
    }

    return false;
  } catch (err: any) {
    console.error('[Svix Webhook] Signature verification error:', err);
    return false;
  }
}
