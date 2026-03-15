import { HmacSigner } from './HmacSigner';

export class RoomKeyRegistry {
  private static instance: RoomKeyRegistry;
  private keys: Map<string, CryptoKey> = new Map();

  static getInstance(): RoomKeyRegistry {
    if (!RoomKeyRegistry.instance) {
      RoomKeyRegistry.instance = new RoomKeyRegistry();
    }
    return RoomKeyRegistry.instance;
  }

  async getRoomKey(masterSecret: string, roomId: string): Promise<CryptoKey> {
    if (!this.keys.has(roomId)) {
      const key = await HmacSigner.deriveRoomKey(masterSecret, roomId);
      this.keys.set(roomId, key);
    }
    return this.keys.get(roomId)!;
  }

  // On host migration, rotate key
  async rotateRoomKey(masterSecret: string, roomId: string, newNonce?: string): Promise<CryptoKey> {
    const key = await HmacSigner.deriveRoomKey(masterSecret + (newNonce || ''), roomId);
    this.keys.set(roomId, key);
    return key;
  }

  clearRoomKey(roomId: string): void {
    this.keys.delete(roomId);
  }
}