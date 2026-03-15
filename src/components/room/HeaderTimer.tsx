import React, { useEffect, useState, useMemo } from 'react';
import {
  Timer,
  Clock,
  Rocket,
  Coffee,
  Target,
  Presentation,
  ShieldAlert,
  Settings2,
  Pause,
  Play,
  X,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimerData } from '@/types/websocket';

interface HeaderTimerProps {
  activeTimer?: TimerData | null;
  joinedAt?: Date | string | null;
  status?: string;
  onClick?: () => void;
  compact?: boolean;
  isHost?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

const TYPE_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; bg: string; border: string; glow: string }
> = {
  end_room: {
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/20',
  },
  break: {
    icon: Coffee,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    glow: 'shadow-blue-400/20',
  },
  task: {
    icon: Target,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    glow: 'shadow-emerald-400/20',
  },
  presentation: {
    icon: Presentation,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    glow: 'shadow-purple-400/20',
  },
  custom: {
    icon: Settings2,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/20',
  },
  default: {
    icon: Timer,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    glow: 'shadow-amber-500/20',
  },
};

const HeaderTimer: React.FC<HeaderTimerProps> = ({
  activeTimer,
  joinedAt,
  status,
  onClick,
  compact = false,
  isHost = false,
  onPause,
  onResume,
  onStop,
}) => {
  const [displayTime, setDisplayTime] = useState<string>('00:00');
  const [label, setLabel] = useState<string>('SESSION');
  const [isCountdown, setIsCountdown] = useState<boolean>(false);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  const config = useMemo(() => {
    if (!activeTimer?.type) return TYPE_CONFIG.default;
    return TYPE_CONFIG[activeTimer.type] || TYPE_CONFIG.default;
  }, [activeTimer?.type]);

  useEffect(() => {
    const updateTimer = () => {
      if (activeTimer) {
        if (activeTimer.isPaused && activeTimer.pausedAt) {
          const startedAt =
            typeof activeTimer.startedAt === 'string'
              ? new Date(activeTimer.startedAt).getTime()
              : activeTimer.startedAt;
          const totalMs = activeTimer.duration * 60 * 1000;
          const elapsedMs = activeTimer.pausedAt - startedAt;
          const remaining = Math.max(0, totalMs - elapsedMs);
          setRemainingMs(remaining);

          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);

          setDisplayTime(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
          setLabel(`${activeTimer.label?.toUpperCase() || 'PAUSED'}`);
          setIsCountdown(true);
          return;
        }

        const startedAt =
          typeof activeTimer.startedAt === 'string'
            ? new Date(activeTimer.startedAt).getTime()
            : activeTimer.startedAt;
        const totalMs = activeTimer.duration * 60 * 1000;
        const elapsedMs = Date.now() - startedAt;
        const remaining = Math.max(0, totalMs - elapsedMs);
        setRemainingMs(remaining);

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        setDisplayTime(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );

        const endTs = startedAt + totalMs;
        const endStr = new Date(endTs).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLabel(`${activeTimer.label?.toUpperCase() || 'PROTOCOL'} • ${endStr}`);
        setIsCountdown(true);
      } else if (joinedAt) {
        const joinTime =
          typeof joinedAt === 'string' || typeof joinedAt === 'number'
            ? new Date(joinedAt).getTime()
            : joinedAt instanceof Date
              ? joinedAt.getTime()
              : Date.now();
        const elapsedMs = Date.now() - joinTime;
        setRemainingMs(0);

        const hours = Math.floor(elapsedMs / 3600000);
        const minutes = Math.floor((elapsedMs % 3600000) / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);

        const timeStr =
          hours > 0
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        setDisplayTime(timeStr);
        setLabel(status?.toUpperCase() || 'SESSION');
        setIsCountdown(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeTimer, joinedAt, status]);

  // Voice notifications
  const spokenMilestones = React.useRef<Set<number>>(new Set());
  useEffect(() => {
    spokenMilestones.current.clear();
  }, [activeTimer?.startedAt, activeTimer?.isPaused]);

  useEffect(() => {
    if (!activeTimer || activeTimer.isPaused) return;

    const checkVoice = () => {
      const startedAt =
        typeof activeTimer.startedAt === 'string'
          ? new Date(activeTimer.startedAt).getTime()
          : activeTimer.startedAt;
      const totalMs = activeTimer.duration * 60 * 1000;
      const elapsedMs = Date.now() - startedAt;
      const remaining = totalMs - elapsedMs;
      const remainingSec = Math.floor(remaining / 1000);

      const speak = (text: string, milestone: number) => {
        if (spokenMilestones.current.has(milestone)) return;
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          window.speechSynthesis.speak(utterance);
          spokenMilestones.current.add(milestone);
        }
      };

      const playBeep = () => {
        try {
          const ctx = new (
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          )();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch (_error) {
          // Audio context might be restricted by browser until user interaction
        }
      };

      if (remainingSec === 300) speak(`5 minutes remaining for ${activeTimer.label}`, 300);
      if (remainingSec === 60) speak(`1 minute remaining for ${activeTimer.label}`, 60);
      if (remainingSec === 0) {
        if (activeTimer.action === 'close') speak(`Room is closing now. Protocol terminated.`, 0);
        else if (activeTimer.action === 'resume')
          speak(`Break session ended. Resuming mission.`, 0);
        else if (activeTimer.action === 'notify') {
          playBeep();
          speak(`Timer ended: ${activeTimer.label}`, 0);
        } else speak(`Timer ended: ${activeTimer.label}`, 0);
      }
    };

    const interval = setInterval(checkVoice, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const isCritical = isCountdown && remainingMs < 60000 && !activeTimer?.isPaused;
  const isDanger = isCountdown && remainingMs < 15000 && !activeTimer?.isPaused;

  const pulseColors = isDanger
    ? ['rgba(239, 68, 68, 0.05)', 'rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.05)']
    : isCritical
      ? ['rgba(239, 68, 68, 0.02)', 'rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.02)']
      : isCountdown && !activeTimer?.isPaused
        ? [
            `${config.bg.replace('/10', '/05')}`,
            `${config.bg.replace('/10', '/20')}`,
            `${config.bg.replace('/10', '/05')}`,
          ]
        : 'rgba(255, 255, 255, 0.05)';

  return (
    <div className='flex items-center gap-2'>
      <motion.div
        layout
        animate={{
          backgroundColor: pulseColors,
          borderColor: isDanger
            ? 'rgba(239, 68, 68, 0.4)'
            : isCritical
              ? 'rgba(239, 68, 68, 0.2)'
              : isCountdown
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.05)',
          scale: isDanger ? [1, 1.03, 1] : isCritical ? [1, 1.01, 1] : 1,
          boxShadow: isDanger
            ? '0 0 20px rgba(239, 68, 68, 0.2)'
            : isCritical
              ? '0 0 10px rgba(239, 68, 68, 0.1)'
              : 'none',
        }}
        transition={{
          duration: isDanger ? 0.5 : isCritical ? 1 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`flex items-center rounded-full border transition-all duration-700 overflow-hidden group ${
          isCountdown ? `${config.glow}` : 'bg-white/5 border-white/5 hover:bg-white/10'
        }`}
      >
        <div 
          className={`flex items-center gap-2 px-3 py-1.5 ${onClick ? 'cursor-pointer hover:bg-white/5 active:bg-white/10' : 'cursor-default'}`}
          onClick={onClick}
        >
          <div className='relative shrink-0'>
            <AnimatePresence mode='wait'>
              {isCountdown ? (
                <motion.div
                  key={`icon-${activeTimer?.type}`}
                  initial={{ scale: 0, opacity: 0, rotate: -180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, rotate: 180 }}
                  className={`${isCritical ? 'bg-red-500/20 text-red-500 border-red-500/30' : `${config.bg} ${config.color} ${config.border}`} p-1.5 rounded-full border transition-colors duration-500`}
                >
                  <config.icon className={`w-3.5 h-3.5 ${isCritical ? 'animate-pulse' : ''}`} />
                </motion.div>
              ) : (
                <motion.div
                  key='elapsed-icon'
                  initial={{ scale: 0, opacity: 0, rotate: 180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0, rotate: -180 }}
                  className='bg-emerald-500/10 p-1.5 rounded-full border border-emerald-500/20 text-emerald-500/70'
                >
                  <Clock className='w-3.5 h-3.5' />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={`flex flex-col ${compact ? 'min-w-0' : 'min-w-[100px]'}`}>
            <AnimatePresence mode='wait'>
              <motion.div
                key={isCountdown ? `${activeTimer?.isPaused ? 'paused' : 'running'}-${label}` : 'elapsed-mode'}
                initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, filter: 'blur(10px)', y: -10 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className='flex flex-col'
              >
                {!compact && (
                  <span
                    className={`text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1 transition-colors duration-500 ${isCritical ? 'text-red-500' : isCountdown ? config.color : 'text-white/40'}`}
                  >
                    {label}
                  </span>
                )}
                <span
                  className={`text-sm font-mono font-bold tabular-nums leading-none tracking-tight transition-colors duration-500 ${isCritical ? 'text-red-400' : isCountdown ? (activeTimer?.isPaused ? 'text-white/60' : 'text-white') : 'text-white/90'}`}
                >
                  {displayTime}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {!compact && !activeTimer && (
            <Rocket
              className='w-3.5 h-3.5 ml-1 transition-all duration-500 text-white/10 group-hover:text-emerald-500/40'
            />
          )}
        </div>

        {/* Sync Controls (Host Only) */}
        {isCountdown && isHost && (
          <div className='flex items-center gap-2 px-3'>
            {activeTimer?.isPaused ? (
              <div className='flex items-center gap-2'>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume?.();
                  }}
                  className='h-8 px-4 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 hover:from-emerald-500/30 hover:to-emerald-500/20 text-emerald-400 transition-all duration-300 flex items-center gap-2 group border border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  title='Resume Timer'
                >
                  <Play className='w-3 h-3 fill-current' />
                  <span className='text-[9px] font-black uppercase tracking-[0.15em] group-hover:text-emerald-300'>Resume</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop?.();
                  }}
                  className='h-8 px-4 rounded-full bg-gradient-to-r from-red-500/20 to-red-500/10 hover:from-red-500/30 hover:to-red-500/20 text-red-500 transition-all duration-300 flex items-center gap-2 group border border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  title='Stop Timer'
                >
                  <X className='w-3 h-3 stroke-[3px]' />
                  <span className='text-[9px] font-black uppercase tracking-[0.15em] group-hover:text-red-400'>Stop</span>
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPause?.();
                }}
                className='h-8 px-4 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 text-amber-500 transition-all duration-300 flex items-center gap-2 group border border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                title='Pause Timer'
              >
                <Pause className='w-3 h-3 fill-current' />
                <span className='text-[9px] font-black uppercase tracking-[0.15em] group-hover:text-amber-300'>Pause</span>
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HeaderTimer;
