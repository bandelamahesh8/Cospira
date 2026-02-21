/**
 * Win Screen Component
 * Closure - calm, not domination
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getWinMessage } from '@/lib/snakeladder/fateFraming';

interface Player {
  id: string;
  name: string;
}

interface WinScreenProps {
  winner: Player;
  onPlayAgain: () => void;
  onExit: () => void;
}

export const SnakeLadderWinScreen = ({ winner, onPlayAgain, onExit }: WinScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }} // Slow, gentle reveal
      className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-slate-900/80 backdrop-blur-sm"
    >
      {/* Board fades */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2 }}
        className="absolute inset-0"
      />

      {/* Calm win reveal */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        {/* Gentle icon */}
        <div className="text-6xl">🎯</div>

        {/* Storybook message */}
        <h2 className="text-3xl font-light text-white">
          {getWinMessage(winner.name)}
        </h2>

        <p className="text-lg text-slate-300 font-light">
          The journey is complete
        </p>

        {/* Others fade respectfully (not shown, just implied) */}

        {/* Calm actions */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex gap-4 mt-4"
        >
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="bg-blue-500 hover:bg-blue-600"
          >
            Another Journey
          </Button>

          <Button
            onClick={onExit}
            size="lg"
            variant="outline"
            className="text-slate-300 border-slate-600"
          >
            Rest
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
