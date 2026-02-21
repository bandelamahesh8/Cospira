/**
 * XO Sound System
 * Bare minimum - feedback, not noise
 */

import { XO_CONFIG } from './config';

class XOSounds {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Play move sound (soft tap)
   */
  playMove(): void {
    if (this.isMuted || !this.audioContext) return;

    this.playTone(300, 0.05, 'sine', XO_CONFIG.SOUND.MOVE_VOLUME);
    
    // Light haptic
    this.vibrate(10);
  }

  /**
   * Play win sound (slightly stronger pulse)
   */
  playWin(): void {
    if (this.isMuted || !this.audioContext) return;

    // Single tone
    this.playTone(400, 0.1, 'sine', XO_CONFIG.SOUND.WIN_VOLUME);
    
    // Stronger haptic pattern
    this.vibrate([20, 10, 20]);
  }

  /**
   * Play draw sound (neutral)
   */
  playDraw(): void {
    if (this.isMuted || !this.audioContext) return;

    this.playTone(350, 0.08, 'sine', XO_CONFIG.SOUND.MOVE_VOLUME);
    this.vibrate(15);
  }

  /**
   * Play tone (helper)
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.1
  ): void {
    if (!this.audioContext) return;

    // Enforce max volume
    volume = Math.min(volume, XO_CONFIG.SOUND.MAX_VOLUME);

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Vibrate (haptic feedback)
   */
  private vibrate(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }
}

export const xoSounds = new XOSounds();
