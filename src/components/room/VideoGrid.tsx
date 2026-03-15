import React, { useState } from 'react';
import VideoTile from '@/components/VideoTile';
import { User } from '@/types/websocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, PinOff, ChevronLeft, ChevronRight, Wifi, X, MicOff } from 'lucide-react';

interface VideoGridProps {
  localStream: MediaStream | null;
  localUserName: string;
  isAudioEnabled: boolean;
  isMediaLoading: boolean;
  remoteStreams: Map<string, MediaStream>;
  users: User[];
  localUserId?: string;
  localUserPhotoUrl?: string | null;
  localUserGender?: string;
  layout?: 'grid' | 'focus' | 'theater';
  isSocialMode?: boolean;
  isSearching?: boolean;
  isVideoEnabled?: boolean;
  revealNames?: boolean; // New prop for Ultra Security blinding
}

const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  localUserName,
  isAudioEnabled,
  isMediaLoading,
  remoteStreams,
  users,
  localUserId,
  localUserPhotoUrl,
  localUserGender,
  layout = 'grid',
  isSocialMode = false,
  isSearching = false,
  isVideoEnabled = true,
  revealNames = true,
}) => {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 9;

  // Filter unique remote users
  const remoteUsers = users
    .filter((u) => String(u.id) !== String(localUserId))
    .filter(
      (user, index, self) => index === self.findIndex((u) => String(u.id) === String(user.id))
    );

  // Helper to render a tile
  const renderTile = (
    id: string,
    name: string,
    stream: MediaStream | null,
    isLocal: boolean,
    isMuted: boolean,
    photoUrl?: string | null,
    gender?: string,
    status?: 'online' | 'away',
    isVideoOn?: boolean,
    hideName?: boolean
  ) => (
    <motion.div
      layout
      layoutId={id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`relative w-full h-full bg-[#0F1115]/80 backdrop-blur-md rounded-2xl md:rounded-[1.5rem] overflow-hidden group ring-1 ring-white/5 shadow-2xl transition-all ${pinnedId === id ? 'ring-primary/50 ring-2 shadow-primary/20' : 'hover:ring-white/20'}`}
    >
      <VideoTile
        stream={stream}
        username={hideName ? 'Participant' : name} // Fallback name
        isLocal={isLocal}
        isMuted={isMuted}
        photoUrl={hideName ? undefined : photoUrl} // Hide avatars too to prevent identification
        gender={hideName ? undefined : gender}
        seed={id}
        isVideoEnabled={isVideoOn}
        hideName={hideName}
        className='w-full h-full object-cover'
      />

      {status === 'away' && (
        <div className='absolute top-4 left-4 z-20 bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1 shadow-lg backdrop-blur-sm'>
          <span>💤</span> AWAY
        </div>
      )}

      {isLocal && isMediaLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[60]'>
          <div className='flex flex-col items-center gap-4'>
            <div className='w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin' />
            <span className='text-[10px] font-black uppercase tracking-widest text-primary'>
              Syncing...
            </span>
          </div>
        </div>
      )}

      {/* Pin Button - Hidden in Social Mode */}
      {!isSocialMode && (
        <div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2 z-30 transform translate-y-2 group-hover:translate-y-0'>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPinnedId(pinnedId === id ? null : id);
            }}
            className={`h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${pinnedId === id ? 'bg-primary text-black border-primary' : 'bg-black/40 border-white/10 text-white hover:bg-white/10'}`}
          >
            {pinnedId === id ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </div>
      )}
    </motion.div>
  );

  // --- SOCIAL MODE (Live Match) Layout ---
  if (isSocialMode) {
    const remoteUser = remoteUsers[0]; // Define remoteUser here to be accessible for console.log
    // console.log('[VideoGrid] Rendering Social Mode', { isSearching, usersCount: users.length, remoteUser });
    const localUserTile = {
      id: localUserId || 'me',
      name: localUserName,
      stream: localStream,
      isLocal: true,
      isMuted: !isAudioEnabled,
      photoUrl: localUserPhotoUrl,
      gender: localUserGender,
      isVideoOn: isVideoEnabled, // Added isVideoOn
    };

    return (
      <div className='w-full h-full flex flex-col gap-4 md:gap-6 min-h-0 relative'>
        {/* Diagnostic Label - Highly Visible */}
        <div className='absolute top-2 left-2 z-[200] bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full animate-pulse shadow-lg'>
          VIDEO GRID ACTIVE
        </div>
        <div className='absolute -top-6 left-0 z-[100] bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full animate-bounce'>
          SOCIAL V3 ACTIVE
        </div>

        {/* Diagnostic Check: Hidden but present to verify render */}
        <div className='sr-only'>Cospira-Social-Render-v3</div>

        {/* OPPOSITE CONTAINER (REMOTE) */}
        <div className='flex-1 w-full min-h-0 relative rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-[#151921] border border-white/10 shadow-2xl'>
          <AnimatePresence mode='wait'>
            {isSearching ? (
              <motion.div
                key='searching'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='absolute inset-0 flex flex-col items-center justify-center bg-[#0A0C10] overflow-hidden'
              >
                <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] animate-pulse' />

                <div className='relative flex flex-col items-center'>
                  <div className='relative mb-12'>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className='absolute -inset-16 bg-emerald-500/10 rounded-full blur-3xl'
                    />

                    <div className='relative flex items-center justify-center'>
                      <div
                        className='absolute w-[400px] h-[400px] border border-emerald-500/10 rounded-full animate-[spin_20s_linear_infinite]'
                        style={{ borderStyle: 'dashed' }}
                      />
                      <div
                        className='absolute w-[300px] h-[300px] border border-emerald-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]'
                        style={{ borderStyle: 'dotted' }}
                      />

                      <div className='absolute w-64 h-64 border border-emerald-500/20 rounded-full animate-[ping_3s_linear_infinite]' />
                      <div className='absolute w-48 h-48 border border-emerald-500/30 rounded-full animate-[ping_3s_linear_infinite_1s]' />

                      <div className='relative w-24 h-24 bg-emerald-500/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)]'>
                        <Wifi className='w-10 h-10 text-emerald-500 animate-pulse' />
                        <motion.div
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className='absolute inset-0 bg-emerald-500/10 rounded-2xl'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-col items-center gap-4 relative z-10'>
                    <h3 className='text-3xl font-black italic tracking-[-0.05em] text-white flex items-center gap-3'>
                      <span className='text-emerald-500 opacity-50 font-mono text-sm'>
                        SEC-LINK:
                      </span>
                      SCANNING FREQUENCIES
                    </h3>

                    <div className='flex flex-col items-center gap-2'>
                      <div className='flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full backdrop-blur-md'>
                        <div className='w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]' />
                        <span className='text-[10px] uppercase font-black tracking-[0.3em] text-emerald-500'>
                          Global Node Discovery Active
                        </span>
                      </div>
                      <div className='text-[9px] text-white/20 font-mono tracking-widest uppercase'>
                        Encryption Mesh Stable • Searching for compatible signal
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : remoteUser ? (
              <motion.div
                key={remoteUser.id}
                className='w-full h-full'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {renderTile(
                  String(remoteUser.id),
                  remoteUser.name,
                  remoteStreams.get(String(remoteUser.id)) || null,
                  false,
                  remoteUser.isMuted || false,
                  remoteUser.photoUrl,
                  remoteUser.gender,
                  remoteUser.status as 'online' | 'away' | undefined,
                  remoteUser.isVideoOn,
                  !revealNames && !isSocialMode // Social mode has its own rules, but default strictly hide
                )}
                <div className='absolute top-6 left-6 z-20 bg-emerald-500/90 text-background text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 flex items-center gap-2'>
                  <div className='w-1.5 h-1.5 bg-background rounded-full animate-pulse' />
                  Signal: Active
                </div>
              </motion.div>
            ) : (
              <div
                key='waiting'
                className='absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0F1115]'
              >
                <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]' />
                <div className='w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 animate-pulse relative z-10'>
                  <Wifi className='w-8 h-8 text-white/40' />
                </div>
                <div className='flex flex-col items-center gap-2 relative z-10'>
                  <span className='text-sm text-white/60 font-black uppercase tracking-[0.4em]'>
                    Establishing Uplink
                  </span>
                  <span className='text-[10px] text-white/20 font-bold uppercase tracking-widest'>
                    Awaiting Remote Synchronicity
                  </span>
                </div>
                <div className='absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5'>
                  <div className='w-1.5 h-1.5 bg-emerald-500/40 rounded-full animate-bounce [animation-delay:-0.3s]' />
                  <div className='w-1.5 h-1.5 bg-emerald-500/40 rounded-full animate-bounce [animation-delay:-0.15s]' />
                  <div className='w-1.5 h-1.5 bg-emerald-500/40 rounded-full animate-bounce' />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* SELF CONTAINER (LOCAL) */}
        <div className='flex-1 w-full min-h-0 relative rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-[#151921] border border-white/10 shadow-2xl'>
          {renderTile(
            localUserTile.id,
            localUserTile.name,
            localUserTile.stream,
            true,
            localUserTile.isMuted,
            localUserTile.photoUrl,
            localUserTile.gender,
            undefined,
            isVideoEnabled,
            false // NEVER hide the local user's own name from themselves
          )}
          <div className='absolute top-6 left-6 z-20 bg-primary/90 text-background text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md border border-white/10'>
            Signal: You
          </div>
        </div>
      </div>
    );
  }

  // Logic for Pinned Mode → popup modal
  const pinnedUser = (() => {
    if (!pinnedId) return null;
    if (localUserId && pinnedId === localUserId) {
      return {
        id: localUserId,
        name: localUserName,
        stream: localStream,
        isLocal: true,
        isMuted: !isAudioEnabled,
        photoUrl: localUserPhotoUrl,
        gender: localUserGender,
        isVideoOn: isVideoEnabled,
      };
    }
    const u = users.find((u) => String(u.id) === pinnedId);
    if (u) {
      return {
        id: String(u.id),
        name: u.name,
        stream: remoteStreams.get(String(u.id)) || null,
        isLocal: false,
        isMuted: u.isMuted || false,
        photoUrl: u.photoUrl,
        gender: u.gender,
        isVideoOn: u.isVideoOn,
      };
    }
    return null;
  })();

  // Standard Grid Mode
  const allParticipants = [
    ...(localUserId
      ? [
          {
            id: localUserId,
            name: localUserName,
            stream: localStream,
            isLocal: true,
            isMuted: !isAudioEnabled,
            photoUrl: localUserPhotoUrl,
            gender: localUserGender,
            status: 'online',
            isVideoOn: isVideoEnabled,
          },
        ]
      : []),
    ...remoteUsers.map((u) => ({
      id: String(u.id),
      name: u.name,
      stream: remoteStreams.get(String(u.id)) || null,
      isLocal: false,
      isMuted: u.isMuted || false,
      photoUrl: u.photoUrl,
      gender: u.gender,
      status: u.status as 'online' | 'away' | undefined,
      isVideoOn: u.isVideoOn,
    })),
  ];

  const getGridCols = (count: number) => {
    // if (layout === 'theater') return 'grid-cols-1 max-w-7xl'; // Removed to allow responsive grid in Fun Mode
    if (layout === 'focus' && count > 1) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    if (count <= 1) return 'grid-cols-1 max-w-5xl';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2 max-w-7xl';
    if (count <= 4) return 'grid-cols-2 max-w-7xl';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4';
  };

  const totalPages = Math.ceil(allParticipants.length / PAGE_SIZE);
  const paginatedParticipants = allParticipants.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const nextPage = () => setPage((p) => Math.min(p + 1, totalPages - 1));
  const prevPage = () => setPage((p) => Math.max(p - 1, 0));

  return (
    <div className='w-full h-full p-4 md:p-8 flex items-center justify-center overflow-y-auto custom-scrollbar relative'>
      <motion.div
        layout
        className={`grid gap-4 md:gap-6 w-full h-full content-center relative z-10 ${getGridCols(paginatedParticipants.length)}`}
        style={{ maxHeight: '100%' }} // Ensure it fits if possible
      >
        <AnimatePresence mode='popLayout'>
          {paginatedParticipants.map((u) => (
            <div
              key={u.id}
              className={`aspect-video w-full ${paginatedParticipants.length === 1 && totalPages === 1 ? 'aspect-[16/9] md:aspect-video h-full max-h-[80vh] shadow-2xl' : ''}`}
            >
              {renderTile(
                u.id,
                u.name,
                u.stream,
                u.isLocal,
                u.isMuted,
                u.photoUrl,
                u.gender,
                u.status as 'online' | 'away' | undefined,
                u.isVideoOn,
                !revealNames && !u.isLocal // Hide name if revealNames is false and user is NOT local
              )}
            </div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#0A0A0A]/80 backdrop-blur-xl px-2 py-2 rounded-full border border-white/10 z-50 shadow-2xl'>
          <button
            onClick={prevPage}
            disabled={page === 0}
            className='w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors text-white'
          >
            <ChevronLeft className='w-4 h-4' />
          </button>
          <div className='flex gap-1'>
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === page ? 'bg-white' : 'bg-white/20'}`}
              />
            ))}
          </div>
          <button
            onClick={nextPage}
            disabled={page === totalPages - 1}
            className='w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors text-white'
          >
            <ChevronRight className='w-4 h-4' />
          </button>
        </div>
      )}

      {/* ── Pinned Participant Popup Modal ── */}
      <AnimatePresence>
        {pinnedUser && (
          <>
            {/* Backdrop */}
            <motion.div
              key='grid-pin-backdrop'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPinnedId(null)}
              className='fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm'
            />

            {/* Modal */}
            <motion.div
              key='grid-pin-modal'
              initial={{ opacity: 0, scale: 0.92, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className='fixed inset-0 z-[201] flex items-center justify-center pointer-events-none px-4'
            >
              <div className='pointer-events-auto w-full max-w-2xl bg-[#0a0d12]/95 rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl'>
                {/* Header */}
                <div className='flex items-center justify-between px-5 py-3.5 border-b border-white/5'>
                  <div className='flex items-center gap-3'>
                    <div className='w-2 h-2 rounded-full bg-primary animate-pulse' />
                    <span className='text-sm font-black uppercase tracking-widest text-white/80'>
                      {pinnedUser.isLocal ? 'Your View' : pinnedUser.name}
                    </span>
                    <span className='px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest flex items-center gap-1'>
                      <Pin size={8} /> Pinned
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => setPinnedId(null)}
                      className='h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest'
                    >
                      <PinOff size={11} /> Unpin
                    </button>
                    <button
                      onClick={() => setPinnedId(null)}
                      className='h-8 w-8 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 text-white/60 hover:text-red-400 transition-all flex items-center justify-center'
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Video */}
                <div className='relative bg-[#05070a] aspect-video'>
                  <div className='absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.5))] pointer-events-none z-10' />
                  {renderTile(
                    pinnedUser.id,
                    pinnedUser.name,
                    pinnedUser.stream,
                    pinnedUser.isLocal,
                    pinnedUser.isMuted,
                    pinnedUser.photoUrl,
                    pinnedUser.gender,
                    undefined,
                    pinnedUser.isVideoOn,
                    !revealNames && !pinnedUser.isLocal
                  )}
                  {pinnedUser.isMuted && (
                    <div className='absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-md'>
                      <MicOff className='w-3 h-3 text-red-400' />
                      <span className='text-[10px] font-black text-red-400 uppercase tracking-widest'>
                        Muted
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className='flex items-center justify-between px-5 py-3 border-t border-white/5'>
                  <span className='text-xs font-black text-white/50'>
                    {pinnedUser.isLocal ? 'You (Local Feed)' : pinnedUser.name}
                  </span>
                  <span className='text-[9px] text-white/20 font-bold uppercase tracking-widest'>
                    Click outside to dismiss
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoGrid;
