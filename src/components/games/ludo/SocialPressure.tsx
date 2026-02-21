/**
 * Social Pressure Component
 * Features: Passive social signals without chat
 */

import { motion } from 'framer-motion';

interface SocialPressureProps {
  opponentThinking: boolean;
  tokenThreatened: boolean;
  opponentColor: string;
}

export const SocialPressure = ({ 
  opponentThinking, 
  tokenThreatened,
  opponentColor 
}: SocialPressureProps) => {
  return (
    <>
      {/* Opponent dice shadow when they hesitate */}
      {opponentThinking && (
        <motion.div
          className="absolute top-4 right-4 pointer-events-none"
          animate={{
            x: [-2, 2, -2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: 1,
            ease: 'easeInOut',
          }}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
            style={{
              backgroundColor: `${opponentColor}20`,
              border: `2px dashed ${opponentColor}`,
            }}
          >
            🤔
          </div>
        </motion.div>
      )}

      {/* Token trembles when threatened */}
      {tokenThreatened && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            x: [-1, 1, -1, 1, 0],
            y: [-1, 1, -1, 1, 0],
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
        />
      )}
    </>
  );
};
