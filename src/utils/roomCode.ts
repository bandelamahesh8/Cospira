/**
 * Utility to obscure Room IDs in the URL bar.
 * Uses Base64 encoding with some character substitution to make it look like a "hcode".
 */

export const encodeRoomId = (roomId: string): string => {
  if (!roomId) return '';
  try {
    // Simple Base64 encoding
    const encoded = btoa(roomId);
    // Make it URL safe and slightly more "hash-like"
    const result = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return result;
  } catch (e) {
    console.error('Failed to encode Room ID', e);
    return roomId;
  }
};

export const decodeRoomId = (code: string): string => {
  if (!code) return '';

  // Standard UUIDs (e.g., from breakout rooms or direct DB IDs) should not be decoded
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) {
    return code;
  }

  try {
    // Restore standard Base64 characters
    let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if necessary
    while (base64.length % 4) {
      base64 += '=';
    }
    // Decode
    const decoded = atob(base64);

    // Sanity Check: The decoded string must be a valid room identifier (alphanumeric, -, _)
    // This prevents "false positive" decodes for raw Room IDs that happen to be valid Base64
    if (!/^[a-zA-Z0-9\-_]+$/.test(decoded)) {
      throw new Error('Decoded content is not a valid Room ID');
    }
    return decoded;
  } catch (_e) {
    // If decoding fails or sanity check fails, assume it's a raw Room ID (backward compatibility)
    return code;
  }
};
