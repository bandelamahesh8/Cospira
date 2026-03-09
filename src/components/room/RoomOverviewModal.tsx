import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, LayoutGrid, Home, ChevronRight, Users, Pin, Lock, Play } from 'lucide-react';
import { useBreakout } from '@/contexts/useBreakout';
import { useOrganization } from '@/contexts/useOrganization';
import { useNavigate, useLocation } from 'react-router-dom';
import type { BreakoutSession } from '@/types/organization';

interface RoomOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ────────────────────────────────────────────────────────────────
// Individual Room Card
// ────────────────────────────────────────────────────────────────
const OverviewRoomCard: React.FC<{
  id: string;
  name: string;
  type: 'MAIN' | 'PARENT' | 'CHILD';
  status: string;
  participantsCount: number;
  isPinned: boolean;
  isCurrentLocation: boolean;
  onPin: () => void;
  onJoin: () => void;
}> = ({ name, type, status, participantsCount, isPinned, isCurrentLocation, onPin, onJoin }) => {
  const isLive = status === 'LIVE' || type === 'MAIN';

  const typeConfig = {
    MAIN: {
      label: 'Main Lobby',
      Icon: Home,
      ringColor: 'border-emerald-500/30',
      bg: 'bg-emerald-500/5',
      dotColor: 'bg-emerald-400',
      textColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      joinBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20',
    },
    PARENT: {
      label: 'Breakout Room',
      Icon: LayoutGrid,
      ringColor: 'border-indigo-500/30',
      bg: 'bg-indigo-500/5',
      dotColor: 'bg-indigo-400',
      textColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10',
      joinBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20',
    },
    CHILD: {
      label: 'Sub-Room',
      Icon: ChevronRight,
      ringColor: 'border-purple-500/30',
      bg: 'bg-purple-500/5',
      dotColor: 'bg-purple-400',
      textColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10',
      joinBg: 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20',
    },
  }[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-2xl border p-4 flex flex-col gap-3 transition-all cursor-default overflow-hidden ${
        isCurrentLocation
          ? `${typeConfig.ringColor} ${typeConfig.bg} shadow-[0_0_24px_rgba(99,102,241,0.12)]`
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]'
      }`}
    >
      {/* Live pulse indicator */}
      {isLive && (
        <span
          className={`absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full ${typeConfig.dotColor} animate-pulse`}
        />
      )}

      {/* "You're here" badge */}
      {isCurrentLocation && (
        <div className='absolute top-3 left-3'>
          <span className='text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'>
            ● HERE
          </span>
        </div>
      )}

      {/* Icon + Name */}
      <div className={`flex items-center gap-2.5 ${isCurrentLocation ? 'mt-5' : 'mt-1'}`}>
        <div className={`p-2 rounded-xl ${typeConfig.iconBg} shrink-0`}>
          <typeConfig.Icon className={`w-3.5 h-3.5 ${typeConfig.textColor}`} />
        </div>
        <div className='min-w-0'>
          <p className='text-[11px] font-black text-white/90 uppercase tracking-tight truncate leading-tight'>
            {name}
          </p>
          <span
            className={`text-[8px] font-bold uppercase tracking-widest ${typeConfig.textColor} opacity-70`}
          >
            {typeConfig.label}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1.5'>
          <Users className='w-3 h-3 text-white/20' />
          <span className='text-[9px] text-white/40 font-bold'>{participantsCount}</span>
        </div>
        <span
          className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
            isLive
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : status === 'PAUSED'
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : status === 'CLOSED'
                  ? 'text-red-400/60 bg-red-500/5 border-red-500/10'
                  : 'text-white/20 bg-white/5 border-white/10'
          }`}
        >
          {type === 'MAIN' ? 'LIVE' : status}
        </span>
      </div>

      {/* Actions */}
      <div className='flex gap-2 pt-1 border-t border-white/[0.05]'>
        {/* Pin toggle */}
        <button
          onClick={onPin}
          className={`shrink-0 p-1.5 rounded-xl border transition-all ${
            isPinned
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
              : 'bg-white/5 border-white/5 text-white/20 hover:border-yellow-500/30 hover:text-yellow-400'
          }`}
          title={isPinned ? 'Unpin' : 'Pin room'}
        >
          <Pin className='w-3 h-3' />
        </button>

        {/* Join button */}
        <button
          onClick={onJoin}
          disabled={!isLive}
          className={`flex-1 h-7 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all border ${
            isCurrentLocation
              ? 'bg-white/5 border-white/10 text-white/30 cursor-default'
              : isLive
                ? `${typeConfig.joinBg} border-transparent text-white shadow-lg`
                : 'bg-white/5 border-white/10 text-white/20 opacity-40 cursor-not-allowed'
          }`}
        >
          {isCurrentLocation ? (
            'Here'
          ) : (
            <>
              <Play className='w-2.5 h-2.5' /> Join
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

// ────────────────────────────────────────────────────────────────
// Main Modal
// ────────────────────────────────────────────────────────────────
export const RoomOverviewModal: React.FC<RoomOverviewModalProps> = ({ isOpen, onClose }) => {
  const { breakouts, setCurrentBreakout, lobbyUsers } = useBreakout();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  const [pinnedRoomIds, setPinnedRoomIds] = useState<Set<string>>(new Set());

  const togglePin = useCallback((id: string) => {
    setPinnedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Determine current user's location from URL
  const currentRoomId = (() => {
    const parts = location.pathname.split('/');
    const last = parts[parts.length - 1];
    if (!last || last === currentOrganization?.id) return 'LOBBY';
    return last;
  })();

  const handleJoin = (roomId: string, breakout?: BreakoutSession) => {
    if (breakout) setCurrentBreakout(breakout);
    navigate(`/room/${roomId}`);
    onClose();
  };

  // Build flat room list for pinned section
  const pinnedMainRoom = pinnedRoomIds.has('__MAIN__');
  const pinnedBreakouts = breakouts.filter((b) => pinnedRoomIds.has(b.id));
  const pinnedChildren = breakouts.flatMap((b) =>
    (b.child_rooms || []).filter((c) => pinnedRoomIds.has(c.id))
  );
  const hasPinned = pinnedMainRoom || pinnedBreakouts.length > 0 || pinnedChildren.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-[500] bg-black/70 backdrop-blur-md'
            onClick={onClose}
          />

          {/* Panel — slides down from top */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className='fixed top-[72px] left-1/2 -translate-x-1/2 z-[501] w-[90vw] max-w-5xl max-h-[80vh] bg-[#0a0c11] border border-white/[0.07] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden'
          >
            {/* Header */}
            <div className='flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/15'>
                  <Eye className='w-4 h-4 text-cyan-400' />
                </div>
                <div>
                  <h2 className='text-xs font-black uppercase tracking-widest text-white'>
                    Room Overview
                  </h2>
                  <p className='text-[9px] text-white/30 uppercase tracking-widest font-medium'>
                    {1 +
                      breakouts.length +
                      breakouts.reduce((a, b) => a + (b.child_rooms?.length || 0), 0)}{' '}
                    total rooms
                    {pinnedRoomIds.size > 0 && (
                      <>
                        {' '}
                        · <span className='text-yellow-400'>{pinnedRoomIds.size} pinned</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <div className='text-[9px] text-white/20 font-medium hidden sm:block'>
                  Click a room to join · Pin to keep on top
                </div>
                <button
                  onClick={onClose}
                  className='p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-all'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className='flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar'>
              {/* ─── Pinned Section ─── */}
              {hasPinned && (
                <section>
                  <div className='flex items-center gap-2 mb-3'>
                    <Pin className='w-3 h-3 text-yellow-400' />
                    <h3 className='text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400/80'>
                      Pinned
                    </h3>
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                    {pinnedMainRoom && (
                      <OverviewRoomCard
                        id='__MAIN__'
                        name={currentOrganization?.name || 'Main Room'}
                        type='MAIN'
                        status='LIVE'
                        participantsCount={lobbyUsers.length}
                        isPinned={true}
                        isCurrentLocation={currentRoomId === 'LOBBY'}
                        onPin={() => togglePin('__MAIN__')}
                        onJoin={() => handleJoin(currentOrganization?.id || '')}
                      />
                    )}
                    {pinnedBreakouts.map((b) => (
                      <OverviewRoomCard
                        key={b.id}
                        id={b.id}
                        name={b.name}
                        type='PARENT'
                        status={b.status}
                        participantsCount={
                          typeof b.participants_count === 'number' ? b.participants_count : 0
                        }
                        isPinned={true}
                        isCurrentLocation={currentRoomId === b.id}
                        onPin={() => togglePin(b.id)}
                        onJoin={() => handleJoin(b.id, b)}
                      />
                    ))}
                    {pinnedChildren.map((c) => (
                      <OverviewRoomCard
                        key={c.id}
                        id={c.id}
                        name={c.name}
                        type='CHILD'
                        status={c.status || 'LIVE'}
                        participantsCount={c.participants_count || 0}
                        isPinned={true}
                        isCurrentLocation={currentRoomId === c.id}
                        onPin={() => togglePin(c.id)}
                        onJoin={() => handleJoin(c.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ─── All Rooms ─── */}
              <section>
                <div className='flex items-center gap-2 mb-3'>
                  <LayoutGrid className='w-3 h-3 text-white/20' />
                  <h3 className='text-[9px] font-black uppercase tracking-[0.2em] text-white/30'>
                    All Rooms
                  </h3>
                </div>
                <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'>
                  {/* Main Lobby */}
                  <OverviewRoomCard
                    id='__MAIN__'
                    name={currentOrganization?.name || 'Main Room'}
                    type='MAIN'
                    status='LIVE'
                    participantsCount={lobbyUsers.length}
                    isPinned={pinnedRoomIds.has('__MAIN__')}
                    isCurrentLocation={currentRoomId === 'LOBBY'}
                    onPin={() => togglePin('__MAIN__')}
                    onJoin={() => handleJoin(currentOrganization?.id || '')}
                  />

                  {/* All breakouts and their children */}
                  {breakouts.map((b) => (
                    <React.Fragment key={b.id}>
                      <OverviewRoomCard
                        id={b.id}
                        name={b.name}
                        type='PARENT'
                        status={b.status}
                        participantsCount={
                          typeof b.participants_count === 'number' ? b.participants_count : 0
                        }
                        isPinned={pinnedRoomIds.has(b.id)}
                        isCurrentLocation={currentRoomId === b.id}
                        onPin={() => togglePin(b.id)}
                        onJoin={() => handleJoin(b.id, b)}
                      />
                      {(b.child_rooms || []).map((c) => (
                        <OverviewRoomCard
                          key={c.id}
                          id={c.id}
                          name={c.name}
                          type='CHILD'
                          status={c.status || 'LIVE'}
                          participantsCount={c.participants_count || 0}
                          isPinned={pinnedRoomIds.has(c.id)}
                          isCurrentLocation={currentRoomId === c.id}
                          onPin={() => togglePin(c.id)}
                          onJoin={() => handleJoin(c.id)}
                        />
                      ))}
                    </React.Fragment>
                  ))}

                  {/* Empty state */}
                  {breakouts.length === 0 && (
                    <div className='col-span-full py-8 text-center'>
                      <LayoutGrid className='w-8 h-8 text-white/10 mx-auto mb-2' />
                      <p className='text-xs text-white/20 italic'>No breakout rooms yet</p>
                      <p className='text-[9px] text-white/10 mt-1'>
                        Create rooms from the Dispatch Center
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Footer hint */}
            <div className='px-6 py-3 border-t border-white/[0.05] shrink-0 flex items-center gap-2'>
              <Lock className='w-3 h-3 text-white/10' />
              <span className='text-[9px] text-white/20 font-medium'>
                Only LIVE rooms are joinable · Pinned rooms stay at the top
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RoomOverviewModal;
