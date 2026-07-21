import crypto from 'crypto';

// Secret key derivation (must be 32 bytes)
const SECRET = process.env.EXTERNAL_API_KEY || process.env.MAILPLUS_GENERAL_API_KEY || 'LocalMileSecKeyFallbackValue2026!!!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET).digest(); // 32 bytes

// Initialization vector length for aes-256-cbc
const IV_LENGTH = 16; 

/**
 * Encrypts a lead/company ID into a secure token.
 */
export function encryptLeadId(leadId: string): string {
  if (!leadId) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(leadId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and Ciphertext as a single hex string: IV:Ciphertext
    const token = iv.toString('hex') + ':' + encrypted;
    // Base64Url encode it to make it clean for URL routing
    return Buffer.from(token, 'utf8').toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  } catch (error) {
    console.error('Failed to encrypt lead ID:', error);
    return '';
  }
}

/**
 * Decrypts a secure token back into the original lead/company ID.
 */
export function decryptLeadId(token: string): string | null {
  if (!token) return null;
  try {
    // Base64Url decode to normal utf8 string
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const rawToken = Buffer.from(base64, 'base64').toString('utf8');
    
    const parts = rawToken.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    
    try {
      const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    } catch (err) {
      // Try fallback key (used on client side when env variables are not present)
      const fallbackKey = crypto.createHash('sha256').update('LocalMileSecKeyFallbackValue2026!!!').digest();
      const decipher = crypto.createDecipheriv('aes-256-cbc', fallbackKey, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    }
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return null;
  }
}
