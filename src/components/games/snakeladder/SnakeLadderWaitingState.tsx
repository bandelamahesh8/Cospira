/**
 * Snake & Ladder Waiting State
 * Storybook calm - anticipation + peace
 */

import { motion } from 'framer-motion';

interface Player {
  id: string;
  name: string;
}

interface SnakeLadderWaitingStateProps {
  players: (Player | null)[];
  maxPlayers?: number;
}

export const SnakeLadderWaitingState = ({ 
  players, 
  maxPlayers = 4 
}: SnakeLadderWaitingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      {/* Dice gently floating / rocking */}
      <motion.div
        animate={{ 
          y: [-5, 5, -5],
          rotate: [-2, 2, -2],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 4, 
          ease: 'easeInOut' 
        }}
        className="w-20 h-20 bg-white rounded-xl shadow-xl flex items-center justify-center text-4xl"
      >
        🎲
      </motion.div>

      {/* Storybook message */}
      <motion.p
        animate={{ opacity: [0.6, 0.9, 0.6] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="text-slate-500 text-lg font-light"
      >
        Preparing the journey...
      </motion.p>

      {/* Player slots (calm, not competitive) */}
      <div className="flex gap-4">
        {Array.from({ length: maxPlayers }).map((_, i) => {
          const player = players[i];
          
          return (
            <motion.div
              key={i}
              className="w-16 h-16 rounded-full flex items-center justify-center font-medium text-white"
              style={{
                backgroundColor: player ? '#3b82f6' : '#e2e8f0',
              }}
              animate={!player ? {
                opacity: [0.4, 0.6, 0.4],
              } : {}}
              transition={{ 
                repeat: player ? 0 : Infinity, 
                duration: 2 
              }}
            >
              {player ? player.name[0].toUpperCase() : '?'}
            </motion.div>
          );
        })}
      </div>

      <p className="text-slate-400 text-sm font-light">
        {players.filter(p => p).length}/{maxPlayers} travelers ready
      </p>
    </div>
  );
};
