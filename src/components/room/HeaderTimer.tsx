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
  }, [activeTimer?.startedAt]);

  useEffect(() => {
    if (!activeTimer) return;

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

  const isCritical = isCountdown && remainingMs < 60000;
  const isDanger = isCountdown && remainingMs < 15000;

  // Animation variants
  const pulseColors = isDanger
    ? ['rgba(239, 68, 68, 0.05)', 'rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']
    : isCountdown
      ? [
          `${config.bg.replace('/10', '/05')}`,
          `${config.bg.replace('/10', '/20')}`,
          `${config.bg.replace('/10', '/05')}`,
        ]
      : 'rgba(255, 255, 255, 0.05)';

  return (
    <motion.div
      layout
      onClick={onClick}
      animate={{
        backgroundColor: pulseColors,
        borderColor: isDanger
          ? 'rgba(239, 68, 68, 0.3)'
          : isCountdown
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(255,255,255,0.05)',
        scale: isDanger ? [1, 1.02, 1] : 1,
      }}
      transition={{ duration: isDanger ? 0.6 : 3, repeat: Infinity, ease: 'easeInOut' }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-700 overflow-hidden group active:scale-95 ${
        isCountdown ? `${config.glow}` : 'bg-white/5 border-white/5 hover:bg-white/10'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className='relative shrink-0'>
        <AnimatePresence mode='wait'>
          {isCountdown ? (
            <motion.div
              key={`icon-${activeTimer?.type}`}
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, rotate: 180 }}
              className={`${isCritical ? 'bg-red-500/20 text-red-500 border-red-500/30' : `${config.bg} ${config.color} ${config.border}`} p-1.5 rounded-full border`}
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
            key={isCountdown ? `${activeTimer?.type}-${label}` : 'elapsed-mode'}
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
              className={`text-sm font-mono font-bold tabular-nums leading-none tracking-tight transition-colors duration-500 ${isCritical ? 'text-red-400' : isCountdown ? 'text-white' : 'text-white/90'}`}
            >
              {displayTime}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {!compact && (
        <>
          <div className='h-6 w-px bg-white/5 mx-1' />
          <Rocket
            className={`w-3.5 h-3.5 transition-all duration-500 ${isCountdown ? `${config.color} scale-110 active:animate-ping` : 'text-white/10 group-hover:text-emerald-500/40'}`}
          />
        </>
      )}
    </motion.div>
  );
};

export default HeaderTimer;
