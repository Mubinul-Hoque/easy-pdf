import crypto from 'crypto';

// --------------------------------------------------------------------------
// File signing secret — MUST be provided via environment in production.
// Validated lazily so Next.js builds succeed without the secret set.
// --------------------------------------------------------------------------
let _fileSigningSecret: string | null = null;

function getFileSigningSecret(): string {
  if (_fileSigningSecret) return _fileSigningSecret;

  const envSecret = process.env.FILE_TOKEN_SECRET || process.env.ADMIN_SECRET;
  if (envSecret && envSecret.length >= 32) {
    _fileSigningSecret = envSecret;
    return _fileSigningSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[EasyPDF Security] FILE_TOKEN_SECRET (or ADMIN_SECRET) is not set or is too short (minimum 32 chars). ' +
        'Set a strong random value before starting the production server.'
    );
  }

  _fileSigningSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[EasyPDF Dev] FILE_TOKEN_SECRET not set. Using ephemeral dev secret.');
  return _fileSigningSecret;
}

// Maximum allowed file size: 100 MB
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export interface FileAccessPayload {
  fileId: string;
  jobId?: string;
  userId?: string | null;
  expiresAt: number; // Unix timestamp in ms
}

/**
 * Generate a cryptographically signed HMAC-SHA256 access token for uploaded files.
 */
export function generateSignedFileToken(payload: FileAccessPayload): string {
  const data = JSON.stringify(payload);
  const base64Data = Buffer.from(data, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getFileSigningSecret())
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Validate and unpack a signed file access token.
 * Returns null if the token is forged, corrupted, or expired.
 */
export function verifySignedFileToken(token: string): FileAccessPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const dotIndex = token.indexOf('.');
    if (dotIndex < 0 || dotIndex !== token.lastIndexOf('.')) return null;

    const base64Data = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);
    if (!base64Data || !signature) return null;

    // Recompute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', getFileSigningSecret())
      .update(base64Data)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const payloadText = Buffer.from(base64Data, 'base64url').toString('utf8');
    const payload: FileAccessPayload = JSON.parse(payloadText);

    if (typeof payload.expiresAt !== 'number' || Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sanitize a filename/storage key to prevent directory traversal (LFI/RFI).
 * Strips: control chars, ../ sequences, backslashes, null bytes.
 * Only allows alphanumerics, dots, dashes, underscores.
 */
export function sanitizeStorageKey(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'secure_document.pdf';

  const sanitized = fileName
    .slice(0, 255)
    .replace(/[\x00-\x1f\x7f]/g, '')     // control characters
    .replace(/(\.\.[/\\])+/g, '')          // ../ and ..\  traversal
    .replace(/^[./\\]+/, '')               // leading dots/slashes
    .replace(/[/\\]/g, '_')               // path separators
    .replace(/[^a-zA-Z0-9._\-]/g, '_')    // allow only safe chars
    .replace(/\.{2,}/g, '.')              // collapse consecutive dots
    .trim();

  return sanitized || 'secure_document.pdf';
}

/**
 * Validate PDF magic bytes. Accepts both %PDF header formats.
 * Rejects any buffer that does not start with the PDF signature.
 */
export function isValidPdfBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  if (!buffer || buffer.byteLength < 5) return false;
  const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
  // %PDF  (0x25 0x50 0x44 0x46)
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}
