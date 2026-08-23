import crypto from 'crypto';

const FILE_SIGNING_SECRET =
  process.env.FILE_TOKEN_SECRET ||
  process.env.ADMIN_SESSION_SECRET ||
  'easypdf_secure_file_token_signature_key_998124_secret';

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
    .createHmac('sha256', FILE_SIGNING_SECRET)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

/**
 * Validate and unpack signed file access token.
 * Returns null if token is forged, corrupted, or expired.
 */
export function verifySignedFileToken(token: string): FileAccessPayload | null {
  try {
    if (!token || !token.includes('.')) return null;

    const [base64Data, signature] = token.split('.');
    if (!base64Data || !signature) return null;

    // Verify cryptographic HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', FILE_SIGNING_SECRET)
      .update(base64Data)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payloadText = Buffer.from(base64Data, 'base64url').toString('utf8');
    const payload: FileAccessPayload = JSON.parse(payloadText);

    // Check expiration timestamp
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sanitize filename and storage path to completely prevent directory traversal attacks (LFI/RFI).
 */
export function sanitizeStorageKey(fileName: string): string {
  // Strip control chars, path traversal sequences (../, ..\), null bytes
  const sanitized = fileName
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/(\.\.[\/\\])+/g, '')
    .replace(/[\\\/]/g, '_')
    .replace(/[^a-zA-Z0-9._\-]/g, '_')
    .trim();

  return sanitized || 'secure_document.pdf';
}

/**
 * Validate MIME type and file magic bytes.
 */
export function isValidPdfBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  if (!buffer || buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer.slice(0, 5));
  // Check for %PDF (0x25, 0x50, 0x44, 0x46)
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}
