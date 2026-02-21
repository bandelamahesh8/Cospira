/**
 * Token Movement Animation Utility
 * Features: Step-by-step hops with acceleration
 */

import { ludoAnimationQueue } from './animationPriority';
import { chainEventManager } from './chainCompression';
import { LUDO_CONFIG } from './config';

interface Position {
  x: number;
  y: number;
}

interface Token {
  id: string;
  color: string;
  position: number;
}

/**
 * Animate token movement along path
 */
export const animateTokenMovement = (
  token: Token,
  path: Position[],
  onComplete: () => void,
  onStep?: (index: number) => void
): void => {
  const baseDuration = 100; // ms per step
  const speedUpAfter = 3; // Speed up after 3 steps
  const speedMultiplier = 0.7; // 30% faster after speedup
  
  // Get chain compression speed
  const chainSpeed = chainEventManager.getAnimationSpeed();
  
  let totalDuration = 0;

  path.forEach((pos, i) => {
    // Calculate duration for this step
    let stepDuration = baseDuration * chainSpeed;
    
    // Speed up long moves
    if (i > speedUpAfter) {
      stepDuration *= speedMultiplier;
    }

    // Add to animation queue
    setTimeout(() => {
      ludoAnimationQueue.add({
        id: `token-move-${token.id}-${i}`,
        type: 'TOKEN_MOVE',
        duration: stepDuration,
        execute: () => {
          // Trigger hop animation
          onStep?.(i);
        },
      });
    }, totalDuration);

    totalDuration += stepDuration;
  });

  // Call completion callback
  setTimeout(onComplete, totalDuration);
};

/**
 * Get hop animation styles
 */
export const getHopAnimationStyles = (isHopping: boolean) => {
  return {
    transform: isHopping ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: isHopping 
      ? '0 6px 12px rgba(0,0,0,0.3)' 
      : '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'all 0.1s ease-out',
  };
};
