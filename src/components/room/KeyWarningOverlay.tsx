import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Keyboard } from 'lucide-react';

interface KeyWarningOverlayProps {
  isVisible: boolean;
  pressedKey: string | null;
  availableChances?: number;
}

export const KeyWarningOverlay: React.FC<KeyWarningOverlayProps> = ({
  isVisible,
  pressedKey,
  availableChances = 3,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className='fixed top-24 left-1/2 -translate-x-1/2 z-[11000] pointer-events-none'
        >
          <div className='flex items-center gap-4 bg-red-950/60 backdrop-blur-md border border-red-500/40 px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.2)] border-b-red-500/80'>
            <div className='w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30'>
              <ShieldAlert className='w-6 h-6 text-red-500 animate-pulse' />
            </div>

            <div className='flex flex-col'>
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-red-400/70 mb-0.5'>
                Security Intercept
              </span>
              <div className='flex items-center gap-2'>
                <span className='text-white font-bold text-sm'>System Key Blocked:</span>
                <div className='px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-xs text-red-400 font-black'>
                  {pressedKey?.toUpperCase() || 'SYSTEM'}
                </div>
              </div>
            </div>

            <div className='ml-4 pl-4 border-l border-white/10 flex flex-col items-center min-w-[80px]'>
              <span
                className={`text-lg font-black leading-none ${availableChances === 1 ? 'text-red-500 animate-pulse' : 'text-white'}`}
              >
                {availableChances}
              </span>
              <span className='text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1'>
                Warnings Left
              </span>
            </div>

            <div className='ml-4 pl-4 border-l border-white/10 flex flex-col items-center'>
              <Keyboard className='w-4 h-4 text-white/20 mb-1' />
              <span className='text-[8px] font-bold text-white/10 uppercase tracking-widest'>
                Global Masking
              </span>
            </div>
          </div>

          {/* Subtle Scanline Effect on the warning */}
          <div className='absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-20'>
            <motion.div
              animate={{ y: ['0%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className='w-full h-1/2 bg-gradient-to-b from-transparent via-red-500/20 to-transparent'
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
