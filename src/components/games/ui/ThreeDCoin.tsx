import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ThreeDCoinProps {
  color: string;
  size?: string | number;
  className?: string;
  isMovable?: boolean;
  onClick?: () => void;
  stackCount?: number;
}

export const ThreeDCoin: React.FC<ThreeDCoinProps> = ({
  color,
  size = '80%',
  className,
  isMovable,
  onClick,
  stackCount,
}) => {
  const baseColor =
    {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-emerald-500',
      yellow: 'bg-amber-400',
      purple: 'bg-purple-500',
    }[color] || `bg-${color}-500`;

  const shadowColor =
    {
      red: 'border-red-700',
      blue: 'border-blue-700',
      green: 'border-emerald-700',
      yellow: 'border-amber-600',
      purple: 'border-purple-700',
    }[color] || `border-${color}-700`;

  return (
    <motion.div
      whileHover={isMovable ? { scale: 1.1, y: -5 } : {}}
      whileTap={isMovable ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={cn(
        'relative rounded-full cursor-pointer transition-all preserve-3d group',
        isMovable ? 'z-50' : 'z-10',
        className
      )}
      style={{
        width: size,
        height: size,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Thickness Layers */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-b-4 translate-y-1',
          shadowColor,
          baseColor,
          'opacity-50'
        )}
      />

      {/* Main Face */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-white/30 shadow-lg flex items-center justify-center',
          baseColor,
          isMovable && 'ring-4 ring-white/50 ring-offset-2 animate-pulse'
        )}
      >
        {/* Decorative inner circle */}
        <div className='w-2/3 h-2/3 rounded-full border border-white/20 flex items-center justify-center'>
          {/* Gloss effect */}
          <div className='absolute top-1 left-2 w-1/3 h-1/3 bg-white/20 rounded-full blur-[2px]' />
        </div>

        {/* Stack Count */}
        {stackCount && stackCount > 1 && (
          <div className='absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-md'>
            {stackCount}
          </div>
        )}
      </div>
    </motion.div>
  );
};
