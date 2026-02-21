/**
 * Player Avatar Component
 * Shows player identity with online and thinking status indicators
 */

import { motion } from 'framer-motion';
import { Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  name: string;
  role: 'white' | 'black';
  isOnline: boolean;
  isThinking: boolean;
  isCurrentPlayer?: boolean;
}

export const PlayerAvatar = ({ 
  name, 
  role, 
  isOnline, 
  isThinking,
  isCurrentPlayer = false 
}: PlayerAvatarProps) => {
  return (
    <div className="relative">
      {/* Avatar circle */}
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border transition-all",
        isCurrentPlayer 
          ? "bg-blue-600 border-blue-400" 
          : "bg-slate-900 border-white/10"
      )}>
        {/* Role icon */}
        {role === 'white' ? (
          <Crown className="w-7 h-7 text-white" />
        ) : (
          <Shield className="w-7 h-7 text-slate-400" />
        )}
      </div>
      
      {/* Online indicator (green dot bottom-right) */}
      {isOnline && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950"
        />
      )}
      
      {/* Thinking indicator (pulsing amber top-right) */}
      {isThinking && (
        <motion.div 
          className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-slate-950"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* Offline indicator (red dot) */}
      {!isOnline && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950" />
      )}
    </div>
  );
};
