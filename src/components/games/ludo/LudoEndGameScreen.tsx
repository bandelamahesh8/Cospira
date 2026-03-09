/**
 * End Game Screen Component
 * Features: Podium-style finish, quick rematch CTA
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, RotateCcw } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  color: string;
}

interface EndGameScreenProps {
  rankings: Player[];
  onRematch: () => void;
  onExit: () => void;
}

export const LudoEndGameScreen = ({ rankings, onRematch, onExit }: EndGameScreenProps) => {
  const winner = rankings[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='fixed inset-0 flex flex-col items-center justify-center z-50 p-8'
      style={{
        backgroundColor: `${winner.color}15`,
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Winner color floods briefly */}
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className='absolute inset-0'
        style={{ backgroundColor: winner.color }}
      />

      {/* Trophy icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className='mb-6'
      >
        <Trophy className='w-20 h-20' style={{ color: winner.color }} />
      </motion.div>

      {/* Winner announcement */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className='text-4xl font-black mb-8'
        style={{ color: winner.color }}
      >
        {winner.name} Wins!
      </motion.h1>

      {/* Podium */}
      <div className='flex gap-4 items-end mb-8'>
        {rankings.slice(0, 3).map((player, i) => {
          const heights = [120, 90, 70];
          const medals = ['🥇', '🥈', '🥉'];
          const delays = [0.4, 0.5, 0.6];

          return (
            <motion.div
              key={player.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: delays[i], type: 'spring' }}
              className='flex flex-col items-center gap-2'
            >
              {/* Medal */}
              <div className='text-4xl'>{medals[i]}</div>

              {/* Player avatar */}
              <div
                className='w-12 h-12 rounded-full flex items-center justify-center text-white font-bold'
                style={{ backgroundColor: player.color }}
              >
                {player.name[0]}
              </div>

              {/* Podium */}
              <div
                className='w-20 rounded-t-lg flex items-center justify-center text-white font-bold'
                style={{
                  height: heights[i],
                  backgroundColor: player.color,
                }}
              >
                {i + 1}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick rematch CTA */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className='flex gap-4'
      >
        <Button
          onClick={onRematch}
          size='lg'
          className='gap-2'
          style={{
            backgroundColor: winner.color,
            color: 'white',
          }}
        >
          <RotateCcw className='w-5 h-5' />
          Play Again
        </Button>

        <Button onClick={onExit} size='lg' variant='outline'>
          Exit
        </Button>
      </motion.div>
    </motion.div>
  );
};
