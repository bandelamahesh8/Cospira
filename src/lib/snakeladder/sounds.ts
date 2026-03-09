/**
 * Snake & Ladder Sound System
 * Storybook tone - NO SHARP SOUNDS EVER
 */

import { SNAKELADDER_CONFIG } from './config';

class SnakeLadderSounds {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.audioContext = new AudioCtx();
    }
  }

  /**
   * Play dice roll sound (soft, gentle)
   */
  playDiceRoll(): void {
    if (this.isMuted || !this.audioContext) return;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(180 + Math.random() * 60, 0.06, 'sine', SNAKELADDER_CONFIG.SOUND.DICE_VOLUME);
      }, i * 60);
    }
  }

  /**
   * Play ladder climb sound (ascending chime - happy, gentle)
   */
  playLadderClimb(): void {
    if (this.isMuted || !this.audioContext) return;

    // Ascending tones (C - E - G)
    this.playTone(523, 0.2, 'sine', SNAKELADDER_CONFIG.SOUND.LADDER_VOLUME); // C
    setTimeout(() => this.playTone(659, 0.2, 'sine', SNAKELADDER_CONFIG.SOUND.LADDER_VOLUME), 200); // E
    setTimeout(() => this.playTone(784, 0.3, 'sine', SNAKELADDER_CONFIG.SOUND.LADDER_VOLUME), 400); // G

    // Light haptic
    this.vibrate(20);
  }

  /**
   * Play snake bite sound (low, gentle descending - NOT harsh)
   */
  playSnakeBite(): void {
    if (this.isMuted || !this.audioContext) return;

    // Gentle descending tones
    this.playTone(400, 0.3, 'sine', SNAKELADDER_CONFIG.SOUND.SNAKE_VOLUME);
    setTimeout(() => this.playTone(300, 0.4, 'sine', SNAKELADDER_CONFIG.SOUND.SNAKE_VOLUME), 300);
    setTimeout(() => this.playTone(250, 0.3, 'sine', SNAKELADDER_CONFIG.SOUND.SNAKE_VOLUME), 600);

    // Very light haptic (not punishing)
    this.vibrate(15);
  }

  /**
   * Play win sound (calm celebration)
   */
  playWin(): void {
    if (this.isMuted || !this.audioContext) return;

    // Gentle victory melody
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', SNAKELADDER_CONFIG.SOUND.WIN_VOLUME);
      }, i * 200);
    });

    this.vibrate([30, 20, 30]);
  }

  /**
   * Play token step sound (soft thud)
   */
  playTokenStep(): void {
    if (this.isMuted || !this.audioContext) return;

    this.playTone(300, 0.05, 'sine', 0.1);
  }

  /**
   * Play a tone (helper)
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.2
  ): void {
    if (!this.audioContext) return;

    // Enforce max volume (never loud)
    volume = Math.min(volume, SNAKELADDER_CONFIG.SOUND.MAX_VOLUME);

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  /**
   * Trigger haptic feedback
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

export const snakeLadderSounds = new SnakeLadderSounds();
