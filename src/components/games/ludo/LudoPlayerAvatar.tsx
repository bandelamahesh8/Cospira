/**
 * Ludo Player Avatar Component
 * Features: Strong color ownership, active turn glow
 */

import { motion } from 'framer-motion';

interface LudoPlayerAvatarProps {
  player: {
    id: string;
    name: string;
    color: string;
  };
  isActive: boolean;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export const LudoPlayerAvatar = ({ 
  player, 
  isActive,
  position = 'bottom'
}: LudoPlayerAvatarProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar with color halo */}
      <motion.div
        className="relative"
        // Active turn: glow pulses
        animate={isActive ? {
          boxShadow: [
            `0 0 0px ${player.color}`,
            `0 0 40px ${player.color}`,
            `0 0 0px ${player.color}`,
          ],
        } : {}}
        transition={{ 
          repeat: isActive ? Infinity : 0, 
          duration: 1.5,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl relative"
          style={{
            backgroundColor: player.color,
            border: '4px solid white',
            boxShadow: `0 4px 12px ${player.color}80`,
          }}
        >
          {player.name[0].toUpperCase()}
          
          {/* Active indicator */}
          {isActive && (
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </div>
      </motion.div>

      {/* Player name */}
      <div className="text-center">
        <p 
          className="font-bold text-sm"
          style={{ color: isActive ? player.color : '#94a3b8' }}
        >
          {player.name}
        </p>
        {isActive && (
          <p className="text-xs text-slate-400">Your turn</p>
        )}
      </div>
    </div>
  );
};
