/**
 * Ludo Waiting State Component
 * Features: Dice-based loader, player color slots
 */

import { motion } from 'framer-motion';

interface Player {
  id: string;
  name: string;
  color: string;
}

interface LudoWaitingStateProps {
  players: (Player | null)[];
  maxPlayers?: number;
}

export const LudoWaitingState = ({ players, maxPlayers = 4 }: LudoWaitingStateProps) => {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308']; // red, blue, green, yellow

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      {/* Dice-based loader - rolls continuously */}
      <motion.div
        animate={{ 
          rotateX: 360, 
          rotateY: 360,
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 2, 
          ease: 'linear' 
        }}
        className="w-20 h-20 bg-white rounded-xl shadow-2xl flex items-center justify-center text-4xl"
      >
        🎲
      </motion.div>

      <p className="text-white text-lg font-bold">Waiting for players...</p>

      {/* Player color slots */}
      <div className="grid grid-cols-2 gap-6">
        {colors.slice(0, maxPlayers).map((color, i) => {
          const player = players[i];
          const isFilled = !!player;

          return (
            <motion.div
              key={color}
              className="relative w-24 h-24 rounded-full flex items-center justify-center font-bold text-white text-xl"
              style={{
                backgroundColor: isFilled ? color : 'transparent',
                border: `4px solid ${color}`,
              }}
              // Empty slots glow faintly
              animate={!isFilled ? {
                opacity: [0.3, 0.6, 0.3],
                boxShadow: [
                  `0 0 0px ${color}`,
                  `0 0 20px ${color}`,
                  `0 0 0px ${color}`,
                ],
              } : {
                // Snap solid when occupied
                boxShadow: `0 0 30px ${color}`,
              }}
              transition={{ 
                repeat: isFilled ? 0 : Infinity, 
                duration: 1.5 
              }}
            >
              {isFilled ? player.name[0].toUpperCase() : '?'}
            </motion.div>
          );
        })}
      </div>

      <p className="text-slate-400 text-sm">
        {players.filter(p => p).length}/{maxPlayers} players joined
      </p>
    </div>
  );
};
