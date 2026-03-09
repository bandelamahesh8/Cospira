/**
 * E2EE utility: client-side encryption for message payloads.
 * Keys are generated and exchanged out-of-band (e.g. room handshake).
 * Uses Web Crypto API; never stores plaintext keys in localStorage without encryption.
 */

const ALG = 'AES-GCM';
const KEY_LEN = 256;
const IV_LEN = 12;
const TAG_LEN = 128;

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALG, length: KEY_LEN }, true, ['encrypt', 'decrypt']);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', bin, { name: ALG, length: KEY_LEN }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<{ iv: string; cipher: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const enc = await crypto.subtle.encrypt(
    { name: ALG, iv, tagLength: TAG_LEN },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    cipher: btoa(String.fromCharCode(...new Uint8Array(enc))),
  };
}

export async function decrypt(
  ivBase64: string,
  cipherBase64: string,
  key: CryptoKey
): Promise<string> {
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: ALG, iv, tagLength: TAG_LEN }, key, cipher);
  return new TextDecoder().decode(dec);
}

export function isE2EESupported(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}
