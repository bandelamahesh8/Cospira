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
import {
  Monitor,
  LayoutGrid,
  X,
  ChevronRight,
  Pin,
  MoreHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import { useBreakout } from '@/contexts/useBreakout';
import { useOrganization } from '@/contexts/useOrganization';
import { useNavigate } from 'react-router-dom';
import type { BreakoutSession, BreakoutParticipant } from '@/types/organization';
import { BreakoutService } from '@/services/BreakoutService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { RippleButton } from '@/components/ui/ripple-button';

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
  onDelete?: () => void;
  onShowParticipants?: () => void;
  mode?: string;
}> = ({
  roomId,
  label,
  type,
  status,
  isCurrent,
  isPinned,
  onSelect,
  onPin,
  onDelete,
  onShowParticipants,
  mode,
}) => {
  const frameW = FRAME_W / SCALE;
  const frameH = FRAME_H / SCALE;

  const borderColor = isCurrent
    ? 'border-cyan-400/70'
    : mode === 'ULTRA_SECURE'
      ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
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

          {/* Context Menu for non-main rooms */}
          {type !== 'MAIN' && onDelete && onShowParticipants && (
            <div className='z-30 relative' onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className='p-0.5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors'>
                    <MoreHorizontal className='w-3 h-3' />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align='end'
                  className='w-48 bg-[#0a0c14] border-white/10 text-white/80 z-[200]'
                >
                  <DropdownMenuItem
                    onClick={onShowParticipants}
                    className='hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white'
                  >
                    <Users className='w-4 h-4 mr-2' />
                    <span className='text-xs'>Show Participants</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className='text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer focus:bg-red-500/20 focus:text-red-300'
                  >
                    <Trash2 className='w-4 h-4 mr-2' />
                    <span className='text-xs'>Delete Room</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Iframe container — the actual room rendered at native size then scaled */}
      <div className='relative flex-1 overflow-hidden' style={{ width: FRAME_W, height: FRAME_H }}>
        <iframe
          src={`/room/${roomId}?preview=true&ghost=true`}
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
// Grid Participants Modal
// ─────────────────────────────────────────────────────────────────────────────
const GridParticipantsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}> = ({ isOpen, onClose, roomId, roomName }) => {
  const [participants, setParticipants] = useState<BreakoutParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && roomId) {
      setIsLoading(true);
      BreakoutService.getBreakoutParticipants(roomId)
        .then(setParticipants)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, roomId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className='relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]'
          >
            <div className='p-5 border-b border-white/5 flex items-center justify-between bg-white/5'>
              <div>
                <h2 className='text-base font-bold text-white tracking-tight flex items-center gap-2'>
                  {roomName}
                  <span className='bg-white/10 text-white/60 text-[10px] px-2 py-0.5 rounded-full font-mono'>
                    {participants.length}
                  </span>
                </h2>
                <p className='text-[10px] text-white/40 font-medium tracking-wider uppercase mt-1'>
                  Room Participants
                </p>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='hover:bg-white/10 rounded-full h-8 w-8 !p-0'
              >
                <X className='w-4 h-4 text-white/70' />
              </Button>
            </div>

            <ScrollArea className='flex-1 p-4'>
              {isLoading ? (
                <div className='flex justify-center items-center py-10'>
                  <div className='w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin' />
                </div>
              ) : participants.length === 0 ? (
                <div className='text-center py-10 text-white/40 text-xs italic'>
                  No participants currently in room.
                </div>
              ) : (
                <div className='space-y-2'>
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className='flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5'
                    >
                      <UserAvatar
                        name={p.user?.display_name || 'Unknown'}
                        avatarUrl={p.user?.avatar_url}
                        className='w-8 h-8'
                      />
                      <div>
                        <div className='text-sm font-semibold text-white/90'>
                          {p.user?.display_name || 'Unknown'}
                        </div>
                        <div className='text-[10px] text-white/40'>
                          {p.role === 'HOST' ? 'Host' : 'Participant'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Grid Delete Room Modal
// ─────────────────────────────────────────────────────────────────────────────
const GridDeleteRoomModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roomName: string;
  isDeleting: boolean;
}> = ({ isOpen, onClose, onConfirm, roomName, isDeleting }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isDeleting ? undefined : onClose}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className='relative w-full max-w-sm bg-[#0A0A0A] border border-red-500/20 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.1)] flex flex-col overflow-hidden'
          >
            <div className='p-6 text-center'>
              <div className='w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                <Trash2 className='w-6 h-6' />
              </div>
              <h2 className='text-lg font-bold text-white mb-2'>Delete Breakout Room</h2>
              <p className='text-sm text-white/50 leading-relaxed mb-6'>
                Are you sure you want to close and permanently delete{' '}
                <span className='text-white font-semibold'>"{roomName}"</span>? All participants
                will be returned to the main lobby.
              </p>
              <div className='flex flex-col sm:flex-row items-center gap-3'>
                <Button
                  variant='ghost'
                  onClick={onClose}
                  disabled={isDeleting}
                  className='flex-1 h-11 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-white rounded-full'
                >
                  Keep Room
                </Button>
                <RippleButton
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className='flex-[1.5] h-11 bg-white hover:bg-[#f3f4f6] border border-white/20 text-[#0a0a0a] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-full shadow-[0_4px_12px_rgba(255,255,255,0.1)] hover:scale-[1.02] transition-transform active:scale-[0.98] text-[10px]'
                  rippleColor='rgba(0, 0, 0, 0.1)'
                >
                  {isDeleting ? (
                    <div className='w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin' />
                  ) : (
                    <>
                      <Trash2 className='w-3.5 h-3.5' />
                      <span>Delete Now</span>
                    </>
                  )}
                </RippleButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Grid View
// ─────────────────────────────────────────────────────────────────────────────
export const RoomsGridView: React.FC<RoomsGridViewProps> = ({ currentRoomId, orgId, onExit }) => {
  const { breakouts, setCurrentBreakout, refreshBreakouts, closeBreakout } = useBreakout();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const [modalRoomId, setModalRoomId] = useState<string | null>(null);
  const [modalRoomName, setModalRoomName] = useState<string>('');

  const [deleteModalData, setDeleteModalData] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

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

  const handleDeleteRoom = (roomId: string, roomName: string) => {
    setDeleteModalData({ id: roomId, name: roomName });
  };

  const confirmDeleteRoom = async () => {
    if (!deleteModalData) return;
    setIsDeletingRoom(true);
    try {
      await closeBreakout(deleteModalData.id);
      setDeleteModalData(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleShowParticipants = (roomId: string, roomName: string) => {
    setModalRoomId(roomId);
    setModalRoomName(roomName);
  };

  // Build ordered list: pinned first, then rest
  type RoomEntry = {
    id: string;
    label: string;
    type: 'MAIN' | 'PARENT' | 'CHILD';
    status: string;
    breakout?: BreakoutSession;
    mode?: string;
  };

  const allRooms: RoomEntry[] = [
    {
      id: orgId,
      label: 'Main Lobby',
      type: 'MAIN',
      status: 'LIVE',
      mode: currentOrganization?.mode,
    },
    ...breakouts.flatMap((b) => [
      {
        id: b.id,
        label: b.name,
        type: 'PARENT' as const,
        status: b.status,
        breakout: b,
        mode: b.mode_override || currentOrganization?.mode,
      },
      ...(b.child_rooms || []).map((c) => ({
        id: c.id,
        label: c.name,
        type: 'CHILD' as const,
        status: c.status || 'LIVE',
        breakout: b,
        mode: c.mode_override || b.mode_override || currentOrganization?.mode,
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
                onDelete={() => handleDeleteRoom(room.id, room.label)}
                onShowParticipants={() => handleShowParticipants(room.id, room.label)}
                mode={room.mode}
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

        {/* Modal explicitly rendered out of typical flow */}
        {modalRoomId && (
          <GridParticipantsModal
            isOpen={!!modalRoomId}
            onClose={() => setModalRoomId(null)}
            roomId={modalRoomId}
            roomName={modalRoomName}
          />
        )}

        <GridDeleteRoomModal
          isOpen={!!deleteModalData}
          onClose={() => setDeleteModalData(null)}
          onConfirm={confirmDeleteRoom}
          roomName={deleteModalData?.name || ''}
          isDeleting={isDeletingRoom}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default RoomsGridView;
