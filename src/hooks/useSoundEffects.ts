import { useCallback, useRef } from 'react';

// Luxury Sound Design System
// Synth-based sounds to avoid asset dependencies

export const useSoundEffects = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize Audio Context lazily (browsers block auto-play)
    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
        try {
            const ctx = initAudio();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch {
            // Context might not be started
        }
    }, [initAudio]);

    const playClick = useCallback(() => {
        // Crisp, high-end click: High pitched sine sine with quick decay
        playTone(800, 'sine', 0.1, 0.03); 
    }, [playTone]);

    const playHover = useCallback(() => {
        // Very subtle airy tick
        playTone(400, 'triangle', 0.05, 0.01);
    }, [playTone]);

    const playSuccess = useCallback(() => {
        // Rising chord arpeggio
        const ctx = initAudio();
        const now = ctx.currentTime;
        [440, 554, 659].forEach((freq, i) => { // A Major
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.05, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.5);
        });
    }, [initAudio]);

    const playError = useCallback(() => {
        // Low dissonance
        const ctx = initAudio();
        const now = ctx.currentTime;
        [100, 150].forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }, [initAudio]);

    return { playClick, playHover, playSuccess, playError };
};
