/**
 * RoomStateBadge — Room State Machine indicator
 *
 * Shows the current room state with animated colors.
 * Hosts get a dropdown to transition states.
 * Non-hosts see a read-only badge with description.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useRoomState, type RoomState } from '@/hooks/useRoomState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STATE_CONFIG: Record<
  RoomState,
  { label: string; dot: string; badge: string; pulse: boolean }
> = {
  CREATED: {
    label: 'Created',
    dot: 'bg-slate-400',
    badge: 'border-slate-400/30 text-slate-300',
    pulse: false,
  },
  WAITING: {
    label: 'Waiting',
    dot: 'bg-amber-400',
    badge: 'border-amber-400/30 text-amber-300',
    pulse: true,
  },
  LIVE: {
    label: 'Live',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-400/30 text-emerald-300',
    pulse: true,
  },
  PRESENTATION: {
    label: 'Presentation',
    dot: 'bg-blue-400',
    badge: 'border-blue-400/30 text-blue-300',
    pulse: true,
  },
  DISCUSSION: {
    label: 'Discussion',
    dot: 'bg-purple-400',
    badge: 'border-purple-400/30 text-purple-300',
    pulse: true,
  },
  LOCKED: {
    label: 'Locked',
    dot: 'bg-red-500',
    badge: 'border-red-500/30 text-red-400',
    pulse: false,
  },
  ENDED: {
    label: 'Ended',
    dot: 'bg-slate-500',
    badge: 'border-slate-500/30 text-slate-500',
    pulse: false,
  },
};

const STATE_DESCRIPTIONS: Record<RoomState, string> = {
  CREATED: 'Room created — awaiting launch.',
  WAITING: "Participants in lobby. Meeting hasn't started.",
  LIVE: 'Open collaboration — everyone can speak.',
  PRESENTATION: 'Host & speakers only. Audience is muted.',
  DISCUSSION: 'Active speaker engagement. Chat open.',
  LOCKED: 'Room locked — no new participants.',
  ENDED: 'Session has ended.',
};

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface RoomStateBadgeProps {
  roomId: string;
  isHost: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket: any;
  compact?: boolean; // small badge variant
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function RoomStateBadge({ roomId, isHost, socket, compact = false }: RoomStateBadgeProps) {
  const { roomState, allStates, isTransitioning, transitionState, lastTransition, statePreset } =
    useRoomState(roomId, socket, isHost);

  const [showHistory, setShowHistory] = useState(false);

  const config = STATE_CONFIG[roomState] ?? STATE_CONFIG.LIVE;

  // ── Badge ────────────────────────────────────
  const BadgeContent = (
    <div
      className={`
      inline-flex items-center gap-1.5 rounded-full px-2.5 py-1
      border bg-black/40 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest
      transition-colors duration-500 ${config.badge}
    `}
    >
      {/* Animated status dot */}
      <span className='relative flex h-2 w-2'>
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-60 ${config.pulse ? 'animate-ping' : ''}`}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`} />
      </span>

      {isTransitioning ? <Loader2 size={10} className='animate-spin' /> : config.label}

      {isHost && !compact && <ChevronDown size={10} className='opacity-60' />}
    </div>
  );

  // ── Transition notification ───────────────────
  const TransitionNotice = lastTransition && (
    <AnimatePresence>
      <motion.div
        key={lastTransition.state}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className='fixed top-20 left-1/2 -translate-x-1/2 z-[200] luxury-glass border border-white/10 rounded-2xl px-4 py-2 text-xs text-center backdrop-blur-xl'
      >
        <span className='text-slate-400'>Room mode → </span>
        <span
          className={`font-black uppercase ${STATE_CONFIG[lastTransition.state]?.badge?.split(' ')[1] ?? 'text-white'}`}
        >
          {STATE_CONFIG[lastTransition.state]?.label}
        </span>
      </motion.div>
    </AnimatePresence>
  );

  // ── Non-host: read-only badge with tooltip ────
  if (!isHost) {
    return (
      <>
        {TransitionNotice}
        <div title={STATE_DESCRIPTIONS[roomState] ?? ''}>{BadgeContent}</div>
      </>
    );
  }

  // ── Host: dropdown to change state ────────────
  // Calculate available transitions from allStates
  const currentDef = allStates.find((s) => s.state === roomState);
  const availableTransitions = currentDef?.transitions ?? [];

  return (
    <>
      {TransitionNotice}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className='focus:outline-none'>{BadgeContent}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side='bottom'
          align='start'
          className='w-64 bg-[#0A0D12]/95 border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-2'
        >
          <DropdownMenuLabel className='text-xs uppercase text-slate-500 font-black tracking-widest px-2 py-1'>
            Room Mode
          </DropdownMenuLabel>

          {/* Current state description */}
          <div className='px-3 py-2 mb-1 rounded-xl bg-white/5'>
            <p className='text-xs text-slate-400 leading-relaxed'>
              {statePreset?.description ?? STATE_DESCRIPTIONS[roomState]}
            </p>
          </div>

          <DropdownMenuSeparator className='bg-white/10' />
          <DropdownMenuLabel className='text-xs uppercase text-slate-500 font-bold tracking-widest px-2 py-1'>
            Switch Mode
          </DropdownMenuLabel>

          {availableTransitions.length === 0 ? (
            <div className='px-3 py-2 text-xs text-slate-600'>No transitions available.</div>
          ) : (
            availableTransitions.map((state) => {
              const sc = STATE_CONFIG[state];
              if (!sc) return null;
              return (
                <DropdownMenuItem
                  key={state}
                  onSelect={() => transitionState(state)}
                  className='flex items-center gap-3 px-3 py-2.5 rounded-xl focus:bg-white/10 cursor-pointer'
                >
                  <span className='relative flex h-2.5 w-2.5'>
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full ${sc.dot} opacity-50 ${sc.pulse ? 'animate-ping' : ''}`}
                    />
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${sc.dot}`} />
                  </span>
                  <span className='font-bold text-sm text-white'>{sc.label}</span>
                  <span className='text-xs text-slate-500 ml-auto truncate max-w-[100px]'>
                    {STATE_DESCRIPTIONS[state]?.slice(0, 30)}…
                  </span>
                </DropdownMenuItem>
              );
            })
          )}

          {/* State History */}
          <DropdownMenuSeparator className='bg-white/10' />
          <button
            onClick={() => setShowHistory((h) => !h)}
            className='w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition-colors'
          >
            {showHistory ? 'Hide' : 'Show'} State History
          </button>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
