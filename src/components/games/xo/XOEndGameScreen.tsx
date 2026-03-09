/**
 * XO End Game Screens
 * Instant loop - frictionless restart
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { XO_CONFIG } from '@/lib/xo/config';

interface EndGameScreenProps {
  result: 'win' | 'loss' | 'draw';
  onRematch: () => void;
  onExit: () => void;
}

export const XOEndGameScreen = ({ result, onRematch, onExit }: EndGameScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: XO_CONFIG.TIMING.BOARD_RESET_MS / 1000,
        // Silence after impact enforced by parent
      }}
      className='fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50'
    >
      {/* Result text - minimal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: XO_CONFIG.TIMING.SILENCE_AFTER_WIN_MS / 1000 }}
        className='text-center mb-8'
      >
        {result === 'win' && <p className='text-white text-2xl font-light'>You won</p>}
        {result === 'loss' && <p className='text-slate-400 text-2xl font-light'>You lost</p>}
        {result === 'draw' && (
          <p className='text-slate-400 text-2xl font-light'>Draw. Well played.</p>
        )}
      </motion.div>

      {/* Actions - one-tap rematch */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay:
            (XO_CONFIG.TIMING.SILENCE_AFTER_WIN_MS + XO_CONFIG.TIMING.END_SESSION_PAUSE_MS) / 1000,
        }}
        className='flex gap-4'
      >
        <Button
          onClick={onRematch}
          size='lg'
          className='bg-white text-slate-900 hover:bg-slate-200'
        >
          Play Again
        </Button>

        <Button
          onClick={onExit}
          size='lg'
          variant='outline'
          className='text-slate-400 border-slate-600'
        >
          Exit
        </Button>
      </motion.div>
    </motion.div>
  );
};
