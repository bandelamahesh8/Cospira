import React from 'react';
import { motion } from 'framer-motion';

export type MascotState = 'IDLE' | 'TYPING' | 'SUCCESS' | 'ERROR' | 'PROCESSING';

interface AuthMascotProps {
  state: MascotState;
  isTyping?: boolean;
  isHoveringCTA?: boolean;
  orbIntensity?: number;
}

const AuthMascot: React.FC<AuthMascotProps> = ({
  state,
  isTyping = false,
  isHoveringCTA = false,
  orbIntensity = 0.3,
}) => {
  const isSuccess = state === 'SUCCESS';
  const isProcessing = state === 'PROCESSING';
  const isError = state === 'ERROR';

  // PHASE 6: Use orbIntensity to scale effects
  const intensityFactor = orbIntensity / 0.3;

  // PHASE 4: Animation States
  // Idle: 1 rotation / 50s = 50 duration
  // Typing: Increased speed
  const baseRotation = isSuccess || isProcessing ? 0 : isTyping ? 15 : 50;
  const rotationDuration = baseRotation / intensityFactor;

  // CTA Click Sequence: Pause motion for ~300ms then processing starts
  // We handle this via the state change to PROCESSING from the parent

  return (
    <div className='relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center select-none pointer-events-none'>
      {/* LAYER 3: AMBIENT FIELD */}
      <motion.div
        className='absolute inset-0 rounded-full blur-[120px] -z-30'
        animate={{
          opacity: isSuccess
            ? 0.3
            : isProcessing
              ? 0.4
              : isHoveringCTA
                ? 0.3
                : isTyping
                  ? 0.2
                  : 0.15,
          scale: isSuccess ? 1.4 : isError ? 0.9 : 1.1,
          background: isError
            ? 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* LAYER 2: ORBIT RINGS */}
      <div className='absolute inset-0 flex items-center justify-center'>
        {/* Ring 1 - Outer (Cyan-ish) */}
        <motion.div
          animate={{
            rotate: isSuccess || isProcessing ? 0 : 360,
            borderColor: isProcessing
              ? 'rgba(165, 180, 252, 0.6)'
              : isHoveringCTA
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(255,255,255,0.05)',
            scale: isProcessing ? 0.98 : 1,
            borderWidth: isHoveringCTA || isProcessing ? 1.5 : 1,
          }}
          transition={{
            rotate: isProcessing
              ? { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
              : { duration: rotationDuration * 1.2, repeat: Infinity, ease: 'linear' },
            default: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
          }}
          className='absolute w-[98%] h-[98%] border-white/5 rounded-full'
          style={{ borderColor: 'rgba(255,255,255,0.03)' }}
        />

        {/* Ring 2 - Middle (Neutral) */}
        <motion.div
          animate={{
            rotate: isSuccess || isProcessing ? 0 : -360,
            borderColor: isProcessing ? 'rgba(129, 140, 248, 0.4)' : 'rgba(255,255,255,0.08)',
            scale: isProcessing ? 1.02 : 1,
          }}
          transition={{
            rotate: isProcessing
              ? { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }
              : { duration: rotationDuration, repeat: Infinity, ease: 'linear' },
            default: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
          }}
          className='absolute w-[70%] h-[70%] border-[1px] border-white/5 rounded-full'
        />

        {/* Ring 3 - Inner (Warmer) */}
        <motion.div
          animate={{
            rotate: isSuccess || isProcessing ? 0 : 360,
            borderColor: isProcessing ? 'rgba(199, 210, 254, 0.7)' : 'rgba(255,255,255,0.12)',
            scale: isProcessing ? 0.95 : 1,
          }}
          transition={{
            rotate: isProcessing
              ? { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }
              : { duration: rotationDuration * 0.8, repeat: Infinity, ease: 'linear' },
            default: { duration: 0.5 },
          }}
          className='absolute w-[45%] h-[45%] border-[1px] border-white/10 rounded-full'
        />
      </div>

      {/* LAYER 1: CORE */}
      <motion.div
        className='relative w-8 h-8 md:w-10 md:h-10 rounded-full z-10'
        animate={{
          scale: isSuccess ? [1, 1.2, 1] : isProcessing ? [1, 1.05, 1] : [1, 1.02, 1],
          boxShadow: isHoveringCTA
            ? `0 0 15px rgba(255, 255, 255, ${0.4 * intensityFactor})`
            : `0 0 ${10 * intensityFactor}px rgba(255, 255, 255, ${0.2 * intensityFactor})`,
          background: isError
            ? 'linear-gradient(135deg, #EF4444 0%, #7F1D1D 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #333333 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
        transition={{
          scale: {
            duration: isProcessing ? 0.6 : 4,
            repeat: isSuccess ? 1 : Infinity,
            ease: 'easeInOut',
          },
          boxShadow: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
          background: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
        }}
        style={{
          opacity: isSuccess ? 0.9 : 0.4,
        }}
      />

      {/* Core Glow Shadow */}
      <motion.div
        animate={{
          opacity: isProcessing ? 0.4 : isHoveringCTA ? 0.2 : 0.1,
          scale: isProcessing || isSuccess ? 1.6 : 1.3,
          background: isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
        }}
        className='absolute w-12 h-12 md:w-16 md:h-16 rounded-full blur-3xl z-0'
      />
    </div>
  );
};

export default AuthMascot;
