/**
 * Spectator Energy Component
 * Features: Passive anticipation cues for non-active players
 */

import { motion } from 'framer-motion';

interface SpectatorViewProps {
  activePlayerColor: string;
  isSpectating: boolean;
  showDiceShadow?: boolean;
  dangerZones?: { x: number; y: number }[];
}

export const SpectatorView = ({ 
  activePlayerColor, 
  isSpectating,
  showDiceShadow = false,
  dangerZones = []
}: SpectatorViewProps) => {
  if (!isSpectating) return null;

  return (
    <>
      {/* Dice shadow for non-active players */}
      {showDiceShadow && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut',
          }}
        >
          <div
            className="w-16 h-16 rounded-lg"
            style={{
              backgroundColor: `${activePlayerColor}20`,
              border: `2px dashed ${activePlayerColor}40`,
            }}
          />
        </motion.div>
      )}

      {/* Kill danger zones flash briefly for everyone */}
      {dangerZones.map((zone, i) => (
        <motion.div
          key={i}
          className="absolute w-12 h-12 rounded-full pointer-events-none"
          style={{
            left: zone.x,
            top: zone.y,
            backgroundColor: '#ef444420',
            border: '2px solid #ef4444',
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 0.8 }}
        />
      ))}
    </>
  );
};
