/**
 * Ludo Sound System
 * Features: Dice roll, kill, win sounds with haptic feedback
 */

class LudoSounds {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const Win = window as unknown as {
        AudioContext: typeof AudioContext;
        webkitAudioContext: typeof AudioContext;
      };
      this.audioContext = new (Win.AudioContext || Win.webkitAudioContext)();
    }
  }

  /**
   * Play dice roll sound (rolling plastic)
   */
  playDiceRoll(): void {
    if (this.isMuted || !this.audioContext) return;

    // Rolling sound - rapid frequency changes

    for (let i = 0; i < 10; i++) {
      const freq = 150 + Math.random() * 100;
      setTimeout(() => {
        this.playTone(freq, 0.03, 'sawtooth', 0.1);
      }, i * 30);
    }

    this.vibrate(30);
  }

  /**
   * Play kill sound (sharp click + vibration)
   */
  playKill(): void {
    if (this.isMuted || !this.audioContext) return;

    // Sharp impact sound
    this.playTone(800, 0.05, 'square', 0.3);

    // Secondary lower tone
    setTimeout(() => {
      this.playTone(200, 0.1, 'sine', 0.2);
    }, 50);

    this.vibrate(50);
  }

  /**
   * Play six celebration sound
   */
  playSix(): void {
    if (this.isMuted || !this.audioContext) return;

    // Ascending tones
    this.playTone(523, 0.1, 'sine', 0.2); // C
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.2), 100); // E

    this.vibrate(20);
  }

  /**
   * Play win sound (victory fanfare)
   */
  playWin(): void {
    if (this.isMuted || !this.audioContext) return;

    // Victory melody
    this.playTone(523, 0.2, 'sine', 0.3); // C
    setTimeout(() => this.playTone(659, 0.2, 'sine', 0.3), 200); // E
    setTimeout(() => this.playTone(784, 0.4, 'sine', 0.3), 400); // G

    this.vibrate([100, 50, 100]);
  }

  /**
   * Play token move sound (subtle hop)
   */
  playTokenMove(): void {
    if (this.isMuted || !this.audioContext) return;

    this.playTone(400, 0.05, 'sine', 0.1);
  }

  /**
   * Play a tone
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.2
  ): void {
    if (!this.audioContext) return;

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

  /**
   * Get mute state
   */
  getMuted(): boolean {
    return this.isMuted;
  }
}

// Singleton instance
export const ludoSounds = new LudoSounds();
