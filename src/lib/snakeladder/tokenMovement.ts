/**
 * Token Movement Utility
 * Narrative over speed - step-by-step journey
 */

import { SNAKELADDER_CONFIG } from './config';
import { snakeLadderSounds } from './sounds';

interface Position {
  x: number;
  y: number;
}

/**
 * Animate token movement along path
 * Deliberate pace with pauses
 */
export const animateTokenMovement = async (
  tokenElement: HTMLElement,
  path: Position[],
  onComplete: () => void,
  onStep?: (index: number) => void
): Promise<void> => {
  const stepDuration = SNAKELADDER_CONFIG.TIMING.TOKEN_STEP_MS;
  const pauseDuration = SNAKELADDER_CONFIG.TIMING.STEP_PAUSE_MS;

  for (let i = 0; i < path.length; i++) {
    const pos = path[i];

    // Hop to square
    await animateHop(tokenElement, pos, stepDuration);

    // Play soft step sound
    snakeLadderSounds.playTokenStep();

    // Callback
    onStep?.(i);

    // Slight pause on each square
    if (i < path.length - 1) {
      await new Promise(resolve => setTimeout(resolve, pauseDuration));
    }
  }

  // Final square - soft thud (already played by last step)
  onComplete();
};

/**
 * Animate single hop
 */
const animateHop = (
  element: HTMLElement,
  to: Position,
  duration: number
): Promise<void> => {
  return new Promise(resolve => {
    element.style.transition = `all ${duration}ms ease-out`;
    element.style.transform = `translate(${to.x}px, ${to.y}px) translateY(-4px)`;

    // Land
    setTimeout(() => {
      element.style.transform = `translate(${to.x}px, ${to.y}px) translateY(0)`;
      setTimeout(resolve, duration * 0.3);
    }, duration * 0.7);
  });
};
