import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import { CHESS_CONFIG } from '@/lib/chess/config';
import { cn } from '@/lib/utils';

interface TimeDisplayProps {
  timeLeft: number;
  isMyTurn: boolean;
  winner?: string | null;
}

export const TimeDisplay = ({ timeLeft, isMyTurn, winner }: TimeDisplayProps) => {
  if (!isMyTurn || winner) return null;

  const isWarning = timeLeft <= CHESS_CONFIG.TIMERS.WARNING_THRESHOLD;
  const isCritical = timeLeft <= CHESS_CONFIG.TIMERS.CRITICAL_THRESHOLD;

  const colorClass = isCritical
    ? CHESS_CONFIG.VISUAL.TIME_PRESSURE_COLORS.CRITICAL
    : isWarning
    ? CHESS_CONFIG.VISUAL.TIME_PRESSURE_COLORS.WARNING
    : CHESS_CONFIG.VISUAL.TIME_PRESSURE_COLORS.NORMAL;

  return (
    <motion.div
      className="flex flex-col items-end gap-1"
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={isCritical ? { duration: 0.5, repeat: Infinity } : {}}
    >
      <Timer
        className={cn('w-4 h-4', colorClass, isCritical && 'animate-pulse')}
      />
      <span className={cn('text-xs font-mono font-black', colorClass)}>
        {timeLeft}s
      </span>
    </motion.div>
  );
};
