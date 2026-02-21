
// Mock btoa/atob for Node environment if missing (Node < 16)
if (typeof btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str).toString('base64');
}
if (typeof atob === 'undefined') {
  global.atob = (b64Encoded) => Buffer.from(b64Encoded, 'base64').toString();
}

const encodeRoomId = (roomId) => {
    if (!roomId) return '';
    try {
        console.log('[roomCode] Encoding:', roomId);
        // Simple Base64 encoding
        const encoded = btoa(roomId);
        // Make it URL safe and slightly more "hash-like"
        const result = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        console.log('[roomCode] Encoded Result:', result);
        return result;
    } catch (e) {
        console.error('Failed to encode Room ID', e);
        return roomId;
    }
};

const decodeRoomId = (code) => {
    if (!code) return '';
    try {
        // Restore standard Base64 characters
        let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if necessary
        while (base64.length % 4) {
            base64 += '=';
        }
        // Decode
        const decoded = atob(base64);

        // Sanity Check: If decoded string contains control characters (garbage), it's likely a raw ID
        // We reject any string containing non-printable ASCII (0-31, 127)
        if (/[\x00-\x1F\x7F]/.test(decoded)) {
             throw new Error('Decoded content contains invalid control characters');
        }

        return decoded;
    } catch (_e) {
        // If decoding fails or sanity check fails, assume it's a raw Room ID (backward compatibility)
        return code;
    }
};

// Test Case from User Report
const badId = "R0IMUzFJ"; 
console.log("Testing ID:", badId);
const codes = encodeRoomId(badId);
console.log("Encoded:", codes);
const decoded = decodeRoomId(codes);
console.log("Decoded back:", decoded);
console.log("Match?", badId === decoded);

// Test Raw ID in Decode (Simulation of user landing on raw link)
console.log("Testing Raw Decode:", badId);
const rawDecoded = decodeRoomId(badId);
console.log("Raw Decoded result (should be same):", rawDecoded);
console.log("Raw Match?", badId === rawDecoded);
