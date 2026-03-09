/**
 * RoomsGridView — Super Host only
 *
 * Replaces the main stage with a grid of miniaturized room previews.
 * Each cell renders the actual /room/{id} page inside an iframe that is
 * scaled down with CSS transform so it looks like a live surveillance panel.
 *
 * The current room gets a cyan dashed highlight border.
 * Bottom-center toggle bar lets the superhost switch back to single-room view.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, LayoutGrid, X, ChevronRight, Pin } from 'lucide-react';
import { useBreakout } from '@/contexts/useBreakout';
import { useNavigate } from 'react-router-dom';
import type { BreakoutSession } from '@/types/organization';

interface RoomsGridViewProps {
  currentRoomId: string;
  orgId: string;
  onExit: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Miniature Room Frame
// Each cell is 300px × 200px container; the iframe is rendered at native
// 1200×800 then scaled to ~25% so it looks like the real room UI.
// ─────────────────────────────────────────────────────────────────────────────
const FRAME_W = 340; // outer px width
const FRAME_H = 220; // outer px height
const SCALE = 0.28; // scale factor (inner iframe = FRAME_W/SCALE × FRAME_H/SCALE)

const MiniRoomFrame: React.FC<{
  roomId: string;
  label: string;
  type: 'MAIN' | 'PARENT' | 'CHILD';
  status: string;
  isCurrent: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onPin: () => void;
}> = ({ roomId, label, type, status, isCurrent, isPinned, onSelect, onPin }) => {
  const frameW = FRAME_W / SCALE;
  const frameH = FRAME_H / SCALE;

  const borderColor = isCurrent
    ? 'border-cyan-400/70'
    : isPinned
      ? 'border-yellow-400/40'
      : 'border-white/[0.06]';

  const typeAccent =
    type === 'MAIN'
      ? 'text-emerald-400'
      : type === 'PARENT'
        ? 'text-indigo-400'
        : 'text-purple-400';
  const typeBadge = type === 'MAIN' ? 'Main Lobby' : type === 'PARENT' ? 'Breakout' : 'Sub-Room';
  const statusLive = status === 'LIVE' || type === 'MAIN';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`relative flex flex-col rounded-2xl border-2 overflow-hidden cursor-default group
        ${borderColor}
        ${isCurrent ? 'shadow-[0_0_28px_rgba(6,182,212,0.25)]' : 'shadow-[0_4px_20px_rgba(0,0,0,0.5)]'}
      `}
      style={{ width: FRAME_W, height: FRAME_H + 44, background: '#080a10' }}
    >
      {/* Mini header bar replicating the actual room header look */}
      <div className='shrink-0 h-[44px] px-3 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0c14]'>
        <div className='flex items-center gap-2 min-w-0'>
          {statusLive && (
            <span className='w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0' />
          )}
          <span className='text-[10px] font-black text-white/80 uppercase tracking-tight truncate max-w-[140px]'>
            {label}
          </span>
          <span
            className={`text-[7px] font-bold uppercase tracking-widest ${typeAccent} opacity-70 shrink-0`}
          >
            {typeBadge}
          </span>
        </div>
        <div className='flex items-center gap-1.5 shrink-0'>
          {isCurrent && (
            <span className='text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/20'>
              ● YOU
            </span>
          )}
          {/* Pin toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`p-0.5 rounded transition-all ${isPinned ? 'text-yellow-400' : 'text-white/20 hover:text-yellow-400'}`}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <Pin className='w-3 h-3' />
          </button>
        </div>
      </div>

      {/* Iframe container — the actual room rendered at native size then scaled */}
      <div className='relative flex-1 overflow-hidden' style={{ width: FRAME_W, height: FRAME_H }}>
        <iframe
          src={`/room/${roomId}?preview=true`}
          title={`Room: ${label}`}
          scrolling='no'
          allow=''
          style={{
            width: frameW,
            height: frameH,
            border: 'none',
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none', // read-only, click on overlay instead
            background: '#080a10',
          }}
        />

        {/* Invisible click overlay to handle navigation */}
        <button
          onClick={onSelect}
          className='absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer'
          title={`Go to ${label}`}
        />

        {/* Join overlay on hover */}
        <div className='absolute inset-0 z-20 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`pointer-events-auto flex items-center gap-1.5 h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white border border-transparent transition-all shadow-lg ${
              isCurrent
                ? 'bg-cyan-600/80 hover:bg-cyan-500'
                : type === 'MAIN'
                  ? 'bg-emerald-700/90 hover:bg-emerald-600'
                  : type === 'PARENT'
                    ? 'bg-indigo-700/90 hover:bg-indigo-600'
                    : 'bg-purple-700/90 hover:bg-purple-600'
            }`}
          >
            {isCurrent ? 'Current' : 'Join'} <ChevronRight className='w-3 h-3' />
          </button>
        </div>

        {/* Dashed border overlay for current room */}
        {isCurrent && (
          <div className='absolute inset-0 pointer-events-none z-30 border-2 border-dashed border-cyan-400/50 rounded-sm' />
        )}
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Grid View
// ─────────────────────────────────────────────────────────────────────────────
export const RoomsGridView: React.FC<RoomsGridViewProps> = ({ currentRoomId, orgId, onExit }) => {
  const { breakouts, setCurrentBreakout, refreshBreakouts } = useBreakout();
  const navigate = useNavigate();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Refresh breakout data when grid opens
  useEffect(() => {
    refreshBreakouts();
  }, [refreshBreakouts]);

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (roomId: string, breakout?: BreakoutSession) => {
    if (breakout) setCurrentBreakout(breakout);
    navigate(`/room/${roomId}`);
    onExit();
  };

  // Build ordered list: pinned first, then rest
  type RoomEntry = {
    id: string;
    label: string;
    type: 'MAIN' | 'PARENT' | 'CHILD';
    status: string;
    breakout?: BreakoutSession;
  };

  const allRooms: RoomEntry[] = [
    { id: orgId, label: 'Main Lobby', type: 'MAIN', status: 'LIVE' },
    ...breakouts.flatMap((b) => [
      { id: b.id, label: b.name, type: 'PARENT' as const, status: b.status, breakout: b },
      ...(b.child_rooms || []).map((c) => ({
        id: c.id,
        label: c.name,
        type: 'CHILD' as const,
        status: c.status || 'LIVE',
        breakout: b,
      })),
    ]),
  ];

  const pinned = allRooms.filter((r) => pinnedIds.has(r.id));
  const unpinned = allRooms.filter((r) => !pinnedIds.has(r.id));
  const ordered = [...pinned, ...unpinned];

  return (
    <AnimatePresence>
      <motion.div
        key='rooms-grid'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='flex-1 flex flex-col bg-[#060810] overflow-hidden relative'
      >
        {/* ── Top bar ── */}
        <div className='flex items-center justify-between px-6 py-3 border-b border-white/[0.05] shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/15'>
              <LayoutGrid className='w-3.5 h-3.5 text-cyan-400' />
            </div>
            <div>
              <h2 className='text-[11px] font-black uppercase tracking-widest text-white'>
                Room Overview
              </h2>
              <p className='text-[8px] text-white/30 uppercase tracking-widest font-medium'>
                {ordered.length} rooms · Super Host view
                {pinnedIds.size > 0 && (
                  <>
                    {' '}
                    · <span className='text-yellow-400'>{pinnedIds.size} pinned</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2 text-[9px] text-white/20 font-medium'>
            <span className='hidden sm:block'>Hover room to join · Pin to keep first</span>
            <button
              onClick={onExit}
              className='p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/30 hover:text-white transition-all'
            >
              <X className='w-3.5 h-3.5' />
            </button>
          </div>
        </div>

        {/* ── Rooms grid ── */}
        <div className='flex-1 overflow-y-auto overflow-x-hidden p-6 no-scrollbar'>
          <motion.div layout className='flex flex-wrap gap-5 justify-start'>
            {ordered.map((room) => (
              <MiniRoomFrame
                key={room.id}
                roomId={room.id}
                label={room.label}
                type={room.type}
                status={room.status}
                isCurrent={
                  room.id === currentRoomId || (room.type === 'MAIN' && currentRoomId === orgId)
                }
                isPinned={pinnedIds.has(room.id)}
                onSelect={() => handleSelect(room.id, room.breakout)}
                onPin={() => togglePin(room.id)}
              />
            ))}
          </motion.div>

          {/* Empty state */}
          {ordered.length <= 1 && (
            <div className='mt-8 text-center text-white/20'>
              <LayoutGrid className='w-10 h-10 mx-auto mb-3 opacity-20' />
              <p className='text-xs italic'>No breakout rooms yet.</p>
              <p className='text-[9px] mt-1'>Create rooms from the Dispatch Center.</p>
            </div>
          )}
        </div>

        {/* ── Bottom toggle bar ── */}
        <div className='shrink-0 flex items-center justify-center gap-3 py-4 border-t border-white/[0.05]'>
          {/* Single room */}
          <button
            onClick={onExit}
            className='flex items-center gap-2 h-11 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all group'
            title='Back to your room'
          >
            <Monitor className='w-4 h-4 group-hover:scale-110 transition-transform' />
            <span className='text-[10px] font-black uppercase tracking-widest'>My Room</span>
          </button>

          {/* Grid view (active) */}
          <button
            className='flex items-center gap-2 h-11 px-5 rounded-2xl bg-cyan-500/15 border-2 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)] cursor-default'
            title='All Rooms Grid (active)'
          >
            <LayoutGrid className='w-4 h-4' />
            <span className='text-[10px] font-black uppercase tracking-widest'>All Rooms</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RoomsGridView;
