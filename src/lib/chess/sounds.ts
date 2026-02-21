/**
 * Chess Sound System
 * Handles all audio feedback for chess moves with intentional variations
 */

import { Howl } from 'howler';
import { CHESS_CONFIG } from './config';

class ChessSounds {
  private moveSound: Howl | null = null;
  private captureSound: Howl | null = null;
  private checkSound: Howl | null = null;
  private enabled: boolean = true;

  constructor() {
    if (!CHESS_CONFIG.FEATURES.SOUND_HAPTICS) {
      return;
    }

    try {
      // Initialize sounds - using data URIs for simple tones initially
      // TODO: Replace with actual sound files
      this.moveSound = new Howl({
        src: [this.generateTone(440, 0.1)], // A4 note, 100ms
        volume: 0.3,
        preload: true,
      });

      this.captureSound = new Howl({
        src: [this.generateTone(523, 0.15)], // C5 note, 150ms
        volume: 0.4,
        preload: true,
      });

      this.checkSound = new Howl({
        src: [this.generateTone(659, 0.2)], // E5 note, 200ms
        volume: 0.5,
        preload: true,
      });
    } catch (error) {
      console.warn('[Chess Sounds] Failed to initialize:', error);
      this.enabled = false;
    }
  }

  /**
   * Generate a simple tone using Web Audio API
   * This is a fallback until real sound files are added
   */
  private generateTone(frequency: number, duration: number): string {
    const sampleRate = 44100;
    const numSamples = sampleRate * duration;
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      buffer[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 5);
    }

    // Convert to WAV data URI
    const wav = this.floatTo16BitPCM(buffer);
    return `data:audio/wav;base64,${btoa(String.fromCharCode(...new Uint8Array(wav)))}`;
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + float32Array.length * 2);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + float32Array.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 44100, true);
    view.setUint32(28, 44100 * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, float32Array.length * 2, true);

    // PCM data
    let offset = 44;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Play move sound with pitch variation for natural feel
   */
  playMove() {
    if (!this.enabled || !this.moveSound) return;

    // Intentional imperfection: ±5% pitch variation
    const pitchVariation = 0.95 + Math.random() * 0.1;
    this.moveSound.rate(pitchVariation);
    this.moveSound.play();
  }

  /**
   * Play capture sound (sharper, more distinct)
   */
  playCapture() {
    if (!this.enabled || !this.captureSound) return;

    const pitchVariation = 0.95 + Math.random() * 0.1;
    this.captureSound.rate(pitchVariation);
    this.captureSound.play();
  }

  /**
   * Play check sound (alert tone)
   */
  playCheck() {
    if (!this.enabled || !this.checkSound) return;

    // No pitch variation for check - should be consistent
    this.checkSound.play();
  }

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const chessSounds = new ChessSounds();
