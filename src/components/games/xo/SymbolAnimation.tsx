/**
 * XO Symbol Animations
 * Confidence over flair - no bounce, no wobble
 */

import { motion } from 'framer-motion';
import { XO_CONFIG } from '@/lib/xo/config';

const DRAW_DURATION = XO_CONFIG.TIMING.SYMBOL_DRAW_MS / 1000;

/**
 * X Symbol - Bold strokes, sharp edges
 * Draws in 120ms
 */
export const AnimatedX = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    {/* First stroke */}
    <motion.line
      x1="20" y1="20" x2="80" y2="80"
      stroke="white"
      strokeWidth="8"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ 
        duration: DRAW_DURATION / 2, 
        ease: 'linear' 
      }}
    />
    
    {/* Second stroke */}
    <motion.line
      x1="80" y1="20" x2="20" y2="80"
      stroke="white"
      strokeWidth="8"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ 
        duration: DRAW_DURATION / 2,
        delay: DRAW_DURATION / 2,
        ease: 'linear'
      }}
    />
  </svg>
);

/**
 * O Symbol - Perfect circle, slightly thinner
 * Traces clockwise in 120ms
 */
export const AnimatedO = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <motion.circle
      cx="50"
      cy="50"
      r="30"
      stroke="white"
      strokeWidth="6"
      fill="none"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ 
        duration: DRAW_DURATION, 
        ease: 'linear' 
      }}
      style={{
        transformOrigin: 'center',
        rotate: -90, // Start from top
      }}
    />
  </svg>
);

/**
 * Static X (no animation)
 */
export const StaticX = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <line x1="20" y1="20" x2="80" y2="80" stroke="white" strokeWidth="8" strokeLinecap="round" />
    <line x1="80" y1="20" x2="20" y2="80" stroke="white" strokeWidth="8" strokeLinecap="round" />
  </svg>
);

/**
 * Static O (no animation)
 */
export const StaticO = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="6" fill="none" />
  </svg>
);
