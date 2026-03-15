import { webcrypto } from 'crypto';

export class HmacSigner {
  private static readonly ALGORITHM = 'HMAC';
  private static readonly HASH = 'SHA-256';
  private static readonly KEY_LENGTH = 32;

  /**
   * Derives a room-scoped key using HKDF-SHA256.
   */
  static async deriveRoomKey(masterSecret: string, roomId: string): Promise<CryptoKey> {
    const masterKey = await webcrypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterSecret),
      'HKDF',
      false,
      ['deriveKey']
    );

    const info = new TextEncoder().encode(`cospira-game-v1:${roomId}`);

    return webcrypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32), // zero salt
        info
      },
      masterKey,
      {
        name: this.ALGORITHM,
        hash: this.HASH
      },
      false,
      ['sign', 'verify']
    );
  }

  /**
   * Signs an event payload.
   */
  static async signEvent(event: any, key: CryptoKey): Promise<string> {
    const payload = JSON.stringify({
      version: event.version,
      roomId: event.roomId,
      sequenceId: event.sequenceId,
      action: event.action,
      payload: event.payload
    });

    const signature = await webcrypto.subtle.sign(
      this.ALGORITHM,
      key,
      new TextEncoder().encode(payload)
    );

    return Buffer.from(signature).toString('hex');
  }

  /**
   * Verifies an event signature.
   */
  static async verifyEvent(event: any, signature: string, key: CryptoKey): Promise<boolean> {
    const payload = JSON.stringify({
      version: event.version,
      roomId: event.roomId,
      sequenceId: event.sequenceId,
      action: event.action,
      payload: event.payload
    });

    const signatureBytes = Buffer.from(signature, 'hex');

    return webcrypto.subtle.verify(
      this.ALGORITHM,
      key,
      signatureBytes,
      new TextEncoder().encode(payload)
    );
  }
}