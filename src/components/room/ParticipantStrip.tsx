import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Minus, ChevronDown, ChevronUp, Pin, PinOff, X, MicOff } from 'lucide-react';
import VideoTile from '@/components/VideoTile';
import UserAvatar from '@/components/UserAvatar';
import { User } from '@/types/websocket';

interface ParticipantStripProps {
  localStream: MediaStream | null;
  localUserName: string;
  isAudioEnabled: boolean;
  isVideoEnabled?: boolean;
  localUserId?: string;
  localUserPhotoUrl?: string | null;
  localUserGender?: string;
  users: User[];
  remoteStreams: Map<string, MediaStream>;
  revealNames?: boolean;
}

interface PinnedParticipant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal: boolean;
  isMuted: boolean;
  photoUrl?: string | null;
  gender?: string;
  isVideoOn?: boolean;
}

export const ParticipantStrip: React.FC<ParticipantStripProps> = ({
  localStream,
  localUserName,
  isAudioEnabled,
  isVideoEnabled = true,
  localUserId,
  localUserPhotoUrl,
  localUserGender,
  users,
  remoteStreams,
  revealNames = true,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [pinnedParticipant, setPinnedParticipant] = useState<PinnedParticipant | null>(null);
  const [snapPosition, setSnapPosition] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  // Initialize to bottom-right on mount
  useEffect(() => {
    if (!isInitialized) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Default to bottom-right (~400px width estimate, 225px height)
      setSnapPosition({ x: w - 420, y: h - 280 });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const stripRect = stripRef.current?.getBoundingClientRect();

    if (!stripRect) return;

    const currentX = stripRect.x;
    const currentY = stripRect.y;
    const stripW = stripRect.width;
    const stripH = stripRect.height;

    const padding = 20;
    const navbarHeight = 80;
    const controlsHeight = 100;

    const corners = [
      // Top-Left
      { x: padding, y: navbarHeight },
      // Top-Right
      { x: w - stripW - padding, y: navbarHeight },
      // Bottom-Left
      { x: padding, y: h - controlsHeight - stripH },
      // Bottom-Right
      { x: w - stripW - padding, y: h - controlsHeight - stripH },
    ];

    let closest = corners[0];
    let minDist = Infinity;

    corners.forEach((p) => {
      const dx = p.x - currentX;
      const dy = p.y - currentY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    });

    setSnapPosition({ x: closest.x, y: closest.y });
  };

  const remoteUsers = users
    .filter((u) => String(u.id) !== String(localUserId))
    .filter(
      (user, index, self) => index === self.findIndex((u) => String(u.id) === String(user.id))
    );

  const allParticipants: PinnedParticipant[] = [
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
      isVideoOn: u.isVideoOn,
    })),
  ];

  const handlePin = (participant: PinnedParticipant) => {
    if (pinnedParticipant?.id === participant.id) {
      setPinnedParticipant(null);
    } else {
      setPinnedParticipant(participant);
    }
  };

  return (
    <>
      {/* ── PARTICIPANT STRIP ── */}
      <div className='w-full bg-[#080b10]/95 backdrop-blur-2xl border-b border-white/5 shrink-0 z-[60] relative'>
        {/* Minimized pill */}
        <AnimatePresence mode='wait'>
          {isMinimized ? (
            <motion.div
              key='minimized'
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='overflow-hidden'
            >
              <div className='flex items-center justify-between px-4 py-1.5'>
                <div className='flex items-center gap-2'>
                  <div className='flex -space-x-2'>
                    {allParticipants.slice(0, 4).map((p) => (
                      <UserAvatar
                        key={p.id}
                        name={!revealNames && !p.isLocal ? 'Participant' : p.name}
                        avatarUrl={!revealNames && !p.isLocal ? undefined : p.photoUrl || undefined}
                        gender={!revealNames && !p.isLocal ? undefined : p.gender}
                        seed={p.id}
                        className='w-5 h-5 border border-[#080b10] text-[8px]'
                      />
                    ))}
                  </div>
                  <span className='text-[10px] font-black uppercase tracking-widest text-white/40'>
                    {allParticipants.length} Participants
                  </span>
                </div>
                <button
                  onClick={() => setIsMinimized(false)}
                  className='flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white'
                  title='Expand participants'
                >
                  <ChevronDown className='w-3.5 h-3.5' />
                  <span className='text-[9px] font-bold uppercase tracking-wider'>Show</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key='expanded'
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className='overflow-hidden'
            >
              {/* Strip Header */}
              <div className='flex items-center justify-between px-4 py-1.5 border-b border-white/5'>
                <span className='text-[9px] font-black uppercase tracking-[0.25em] text-white/30'>
                  Participants · {allParticipants.length}
                </span>
                <button
                  onClick={() => setIsMinimized(true)}
                  className='flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-white/5 transition-colors text-white/30 hover:text-white/60'
                  title='Minimize participant strip'
                >
                  <Minus className='w-3 h-3' />
                  <ChevronUp className='w-3 h-3' />
                </button>
              </div>

              {/* Thumbnails Row — 8 per row, fully responsive */}
              <div
                className='grid px-3 py-1.5 gap-1.5'
                style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}
              >
                {allParticipants.map((p) => {
                  const isPinned = pinnedParticipant?.id === p.id;
                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className='relative group/tile min-w-0'
                    >
                      {/* Thumbnail — aspect-video fills available column width */}
                      <div
                        className={`relative w-full aspect-video rounded-lg overflow-hidden bg-[#0d1117] cursor-pointer border transition-all duration-200 ${
                          isPinned
                            ? 'border-primary/60 shadow-[0_0_8px_rgba(0,200,255,0.3)]'
                            : 'border-white/5 hover:border-white/20'
                        }`}
                        onClick={() => handlePin(p)}
                      >
                        <VideoTile
                          stream={p.stream}
                          username={!revealNames && !p.isLocal ? 'Participant' : p.name}
                          isLocal={p.isLocal}
                          isMuted={p.isMuted}
                          photoUrl={!revealNames && !p.isLocal ? undefined : p.photoUrl}
                          gender={!revealNames && !p.isLocal ? undefined : p.gender}
                          seed={p.id}
                          isVideoEnabled={p.isVideoOn}
                          hideName
                          className='w-full h-full'
                        />

                        {/* Pin Button - appears on hover */}
                        <div className='absolute top-0.5 right-0.5 opacity-0 group-hover/tile:opacity-100 transition-all duration-200 z-30'>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePin(p);
                            }}
                            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                              isPinned
                                ? 'bg-primary text-black border-primary'
                                : 'bg-black/60 border-white/20 text-white hover:bg-white/20'
                            }`}
                            title={isPinned ? 'Unpin' : 'Pin to popup'}
                          >
                            {isPinned ? <PinOff size={7} /> : <Pin size={7} />}
                          </button>
                        </div>

                        {/* Muted indicator */}
                        {p.isMuted && (
                          <div className='absolute bottom-0.5 left-0.5 z-20'>
                            <div className='w-3 h-3 rounded-full bg-red-500/90 flex items-center justify-center'>
                              <MicOff className='w-1.5 h-1.5 text-white' />
                            </div>
                          </div>
                        )}

                        {/* "YOU" label */}
                        {p.isLocal && (
                          <div className='absolute top-0.5 left-0.5 px-1 py-px bg-primary/90 text-background text-[6px] font-black uppercase tracking-widest rounded z-20'>
                            You
                          </div>
                        )}
                      </div>

                      {/* Name below thumbnail */}
                      <div className='mt-px text-center'>
                        <span className='text-[6px] font-bold text-white/40 uppercase tracking-wider truncate block w-full'>
                          {p.isLocal ? 'You' : !revealNames ? 'Participant' : p.name}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Empty state */}
                {allParticipants.length === 0 && (
                  <div className='flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-widest py-4'>
                    <div className='w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse' />
                    Awaiting participants...
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── DRAGGABLE PINNED PARTICIPANT POPUP ── */}
      <AnimatePresence>
        {pinnedParticipant && isInitialized && (
          <motion.div
            ref={stripRef}
            key='pinned-popup'
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0.9, x: snapPosition.x, y: snapPosition.y }}
            animate={{ opacity: 1, scale: 1, x: snapPosition.x, y: snapPosition.y }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className='fixed top-0 left-0 z-[201] w-full max-w-[400px] bg-[#0a0d12]/95 rounded-2xl overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl cursor-grab active:cursor-grabbing'
          >
            {/* Header Area (Drag Handle) */}
            <div className='flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 pointer-events-none'>
              <div className='flex items-center gap-2'>
                <div className='w-1.5 h-1.5 rounded-full bg-primary animate-pulse' />
                <span className='text-[10px] font-black uppercase tracking-widest text-white/60'>
                  {pinnedParticipant.isLocal
                    ? 'You'
                    : !revealNames
                      ? 'Participant'
                      : pinnedParticipant.name}
                </span>
              </div>
              <div className='flex items-center gap-2 pointer-events-auto'>
                <button
                  onClick={() => setPinnedParticipant(null)}
                  className='h-6 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all flex items-center gap-1 text-[8px] font-black uppercase tracking-widest'
                >
                  <PinOff size={8} /> Unpin
                </button>
                <button
                  onClick={() => setPinnedParticipant(null)}
                  className='h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-white/60 hover:text-red-400 transition-all flex items-center justify-center'
                >
                  <X size={10} />
                </button>
              </div>
            </div>

            {/* Video Area */}
            <div className='relative aspect-video bg-black/40'>
              <VideoTile
                stream={pinnedParticipant.stream}
                username={
                  !revealNames && !pinnedParticipant.isLocal
                    ? 'Participant'
                    : pinnedParticipant.name
                }
                isLocal={pinnedParticipant.isLocal}
                isMuted={pinnedParticipant.isMuted}
                photoUrl={
                  !revealNames && !pinnedParticipant.isLocal
                    ? undefined
                    : pinnedParticipant.photoUrl
                }
                gender={
                  !revealNames && !pinnedParticipant.isLocal ? undefined : pinnedParticipant.gender
                }
                seed={pinnedParticipant.id}
                isVideoEnabled={pinnedParticipant.isVideoOn}
                hideName
                className='w-full h-full'
              />

              {/* Corner Status Badges */}
              <div className='absolute bottom-2 left-2 z-20'>
                <span
                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border backdrop-blur-md ${
                    pinnedParticipant.stream
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/5 text-white/40 border-white/10'
                  }`}
                >
                  {pinnedParticipant.stream ? 'Live' : 'No Feed'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ParticipantStrip;
