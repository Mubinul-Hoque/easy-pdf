/**
 * Produce a safe, non-leaking API error response body.
 * Technical details (err.message, stack) are NEVER sent to the client —
 * only an opaque code and a generic user-facing message.
 */
export function safeApiError(
  err: unknown,
  clientMessage = 'An internal server error occurred.',
  code = 'INTERNAL_ERROR'
): { success: false; error: { code: string; message: string } } {
  // Always log the real error server-side for developers/admins
  if (err instanceof Error) {
    console.error(`[API Error] ${code}:`, err.message, err.stack?.slice(0, 800));
  } else {
    console.error(`[API Error] ${code}:`, err);
  }

  return {
    success: false,
    error: {
      code,
      message: clientMessage,
    },
  };
}

/**
 * Validate that a Bearer token is present in the Authorization header
 * or the admin session cookie, and return the raw token string.
 */
export function extractBearerToken(
  headers: Headers,
  cookies: { get: (name: string) => { value: string } | undefined },
  cookieName: string
): string {
  const authHeader = headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return cookies.get(cookieName)?.value || '';
}
