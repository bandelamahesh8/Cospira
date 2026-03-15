import React, { useEffect, useState } from 'react';
import { Timer, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AITimerProps {
  duration: number; // in minutes
  startedAt: number; // timestamp
  label: string;
  isPaused?: boolean;
  onComplete?: () => void;
}

const AITimer: React.FC<AITimerProps> = ({
  duration,
  startedAt,
  label,
  isPaused = false,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (isPaused) return;

    const calculateTimeLeft = () => {
      const totalMs = duration * 60 * 1000;
      const elapsedMs = Date.now() - startedAt;
      const remaining = Math.max(0, totalMs - elapsedMs);
      setTimeLeft(remaining);

      if (remaining === 0 && onComplete) {
        onComplete();
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [duration, startedAt, onComplete, isPaused]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  if (timeLeft === 0) return null;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className='flex items-center gap-4 bg-[#0A0A0A]/90 backdrop-blur-xl border border-amber-500/20 px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.15)] group hover:border-amber-500/40 transition-colors cursor-default'
    >
      <div className='relative'>
        <div className='absolute inset-0 bg-amber-500 rounded-full blur animate-pulse opacity-50' />
        <div className='relative bg-amber-500/10 p-2 rounded-full border border-amber-500/30 text-amber-500'>
          <Timer className='w-4 h-4' />
        </div>
      </div>

      <div className='flex flex-col'>
        <span className={`text-[9px] uppercase tracking-[0.2em] font-black leading-none mb-1 transition-colors duration-500 ${isPaused ? 'text-amber-500' : 'text-amber-500/60'}`}>
          {isPaused ? 'PAUSED' : (label || 'Protocol Timer')}
        </span>
        <span className={`text-xl font-mono font-black tabular-nums leading-none tracking-tight transition-all duration-500 ${isPaused ? 'text-white/40 filter-none' : 'text-white filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}>
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>

      <div className='h-8 w-px bg-white/10' />

      <Clock className='w-4 h-4 text-white/20 group-hover:text-amber-500/50 transition-colors animate-[spin_10s_linear_infinite]' />
    </motion.div>
  );
};

export default AITimer;
