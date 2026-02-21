/**
 * Intent Highlighting Component
 * Features: Emphasize strongest moves without auto-moving
 */

import { motion } from 'framer-motion';
import { LUDO_CONFIG } from '@/lib/ludo/config';

interface TokenHighlightProps {
  tokenId: string;
  canKill: boolean;
  isSafe: boolean;
  isNormal: boolean;
}

export const TokenHighlight = ({ tokenId, canKill, isSafe, isNormal }: TokenHighlightProps) => {
  if (!LUDO_CONFIG.FEATURES.INTENT_HIGHLIGHTING) {
    return null;
  }

  const getGlowIntensity = () => {
    if (canKill) return LUDO_CONFIG.VISUAL.KILL_GLOW_INTENSITY;
    if (isSafe) return LUDO_CONFIG.VISUAL.SAFE_GLOW_INTENSITY;
    if (isNormal) return LUDO_CONFIG.VISUAL.NORMAL_GLOW_INTENSITY;
    return 0;
  };

  const getGlowColor = () => {
    if (canKill) return 'rgba(239, 68, 68, '; // Red for kill
    if (isSafe) return 'rgba(34, 197, 94, '; // Green for safe
    return 'rgba(59, 130, 246, '; // Blue for normal
  };

  const intensity = getGlowIntensity();
  const color = getGlowColor();

  if (intensity === 0) return null;

  return (
    <motion.div
      className="absolute inset-0 rounded-full pointer-events-none"
      animate={{
        boxShadow: [
          `0 0 0px ${color}0)`,
          `0 0 ${canKill ? 15 : 10}px ${color}${intensity})`,
          `0 0 0px ${color}0)`,
        ],
      }}
      transition={{
        repeat: Infinity,
        duration: canKill ? 0.8 : 1.5, // Faster pulse for kill moves
        ease: 'easeInOut',
      }}
    />
  );
};
