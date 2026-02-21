import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeControlProps {
  initialTime: number; // seconds
  increment?: number; // seconds added per move
  isActive: boolean;
  isMyTurn: boolean;
  onTimeout: () => void;
  onMove?: () => void;
}

export function TimeControl({
  initialTime,
  increment = 0,
  isActive,
  isMyTurn,
  onTimeout,
  onMove,
}: TimeControlProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isPaused, setIsPaused] = useState(false);

  // Reset time when game starts
  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  // Add increment when move is made
  useEffect(() => {
    if (onMove && increment > 0) {
      setTimeLeft((prev) => prev + increment);
    }
  }, [onMove, increment]);

  // Timer countdown
  useEffect(() => {
    if (!isActive || !isMyTurn || isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isMyTurn, isPaused, onTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 10) return 'text-red-500';
    if (timeLeft <= 30) return 'text-orange-500';
    if (timeLeft <= 60) return 'text-yellow-500';
    return 'text-white';
  };

  return (
    <Card
      className={cn(
        'px-6 py-4 transition-all duration-300',
        isMyTurn && isActive
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 border-green-400 shadow-lg shadow-green-500/50'
          : 'bg-slate-900 border-slate-700'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock
            className={cn(
              'w-5 h-5',
              isMyTurn && isActive ? 'text-white animate-pulse' : 'text-slate-500'
            )}
          />
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              {isMyTurn ? 'Your Time' : 'Opponent Time'}
            </p>
            <p className={cn('text-3xl font-mono font-bold', getTimeColor())}>
              {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        {increment > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-400">Increment</p>
            <p className="text-sm font-bold text-white">+{increment}s</p>
          </div>
        )}
      </div>

      {/* Low time warning */}
      {timeLeft <= 10 && isMyTurn && isActive && (
        <div className="mt-2 px-3 py-1 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="text-xs font-bold text-red-400 text-center animate-pulse">
            ⚠️ LOW TIME!
          </p>
        </div>
      )}
    </Card>
  );
}

// Preset time controls
export const TIME_CONTROLS = {
  bullet: { time: 60, increment: 0, name: 'Bullet (1+0)' },
  blitz: { time: 180, increment: 2, name: 'Blitz (3+2)' },
  rapid: { time: 600, increment: 0, name: 'Rapid (10+0)' },
  classical: { time: 1800, increment: 0, name: 'Classical (30+0)' },
} as const;

export type TimeControlPreset = keyof typeof TIME_CONTROLS;
