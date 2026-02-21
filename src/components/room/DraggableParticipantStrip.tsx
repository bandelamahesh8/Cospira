import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoTile from '@/components/VideoTile';
import UserAvatar from '@/components/UserAvatar';
import { User } from '@/types/websocket';

interface DraggableParticipantStripProps {
    localStream: MediaStream | null;
    localUserName: string;
    isAudioEnabled: boolean;
    authUser: User | null;
    socket: { id: string } | null;
    users: User[];
    remoteStreams: Map<string, MediaStream>;
    localUserPhotoUrl?: string | null;
    localUserGender?: string;
}

export const DraggableParticipantStrip: React.FC<DraggableParticipantStripProps> = ({
    localStream,
    localUserName,
    isAudioEnabled,
    authUser,
    socket,
    users,
    remoteStreams,
    localUserPhotoUrl,
    localUserGender
}) => {
    const stripRef = useRef<HTMLDivElement>(null);
    const [snapPosition, setSnapPosition] = useState({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false);
    const [scale, setScale] = useState(1);
    const [isMinimized, setIsMinimized] = useState(false);

    // Initialize to bottom-right on mount
    useEffect(() => {
        if (!isInitialized) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            // Default to bottom-right (~350px width estimate, 150px height)
            // Using a safe margin
            setSnapPosition({ x: w - 380, y: h - 180 });
            setIsInitialized(true);
        }
    }, [isInitialized]);

    // Handle Snap Logic
    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, _info: PanInfo) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const stripRect = stripRef.current?.getBoundingClientRect();
        
        // If we can't measure, strictly fallback or skip
        if (!stripRect) return;

        const currentX = stripRect.x;
        const currentY = stripRect.y;
        const stripW = stripRect.width;
        const stripH = stripRect.height;

        // Define Snap Zones (Coordinates)
        // We want to snap the TOP-LEFT of the element to these coordinates
        const padding = 20;
        const navbarHeight = 100; // rough height of header
        const controlsHeight = 120; // rough height of bottom controls

        const safCorners = [
            // Top-Left
            { x: padding, y: navbarHeight },
            // Top-Right (x is calculated so element ends at w - padding)
            { x: w - stripW - padding, y: navbarHeight },
            // Bottom-Left
            { x: padding, y: h - controlsHeight - stripH },
            // Bottom-Right
            { x: w - stripW - padding, y: h - controlsHeight - stripH }
        ];

        // Find closest corner
        let closest = safCorners[0];
        let minDist = Infinity;

        safCorners.forEach(p => {
            const dx = p.x - currentX;
            const dy = p.y - currentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                closest = p;
            }
        });

        // Update state to animate to this position
        // Since we are using animate={snapPosition}, framer-motion will handle the transition
        // However, drag sets the 'absolute' transform. Using animate overrides it.
        // We must ensure we are passing absolute coordinates if using layout or fixed, 
        // OR offsets if using relative.
        // Since we used 'fixed top-0 left-0', x/y correspond to window coordinates.
        setSnapPosition({ x: closest.x, y: closest.y });
    };

    const toggleScale = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => (prev >= 2 ? 1 : prev + 0.5));
    };

    if (!isInitialized) return null;

    if (isMinimized) {
        return (
            <motion.div
                drag
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                animate={{ x: snapPosition.x, y: snapPosition.y }}
                className='fixed top-0 left-0 z-[150] cursor-grab active:cursor-grabbing'
                style={{ x: snapPosition.x, y: snapPosition.y }}
            >
                <div className="luxury-glass flex items-center gap-3 px-4 py-2.5 rounded-full border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group bg-[#0A0A0A]/90 backdrop-blur-xl hover:border-white/20 transition-all">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20"
                        onClick={() => setIsMinimized(false)}
                    >
                        <Maximize className="h-3 w-3" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                            {users.slice(0, 3).map(u => (
                                <UserAvatar key={u.id} name={u.name} seed={u.id} className="w-6 h-6 border-2 border-[#0A0A0A]" />
                            ))}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{users.length} Users</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div 
            ref={stripRef}
            drag
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            animate={{ x: snapPosition.x, y: snapPosition.y, scale: scale }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className='fixed top-0 left-0 z-[150] flex flex-col gap-2 p-2 max-w-[90vw] cursor-grab active:cursor-grabbing group/strip origin-top-left'
            style={{ x: snapPosition.x, y: snapPosition.y }} // Set initial style to avoid flash
        >
            {/* Resize Handle / Toggle - Absolute inside container */}
            <div className="absolute -top-3 right-0 p-1 z-[160] opacity-0 group-hover/strip:opacity-100 transition-opacity pointer-events-auto flex gap-1">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full bg-black/80 hover:bg-white text-white hover:text-black border border-white/10 shadow-lg transition-all"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize"
                >
                    <div className="w-2.5 h-0.5 bg-current rounded-full" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full bg-black/80 hover:bg-white text-white hover:text-black border border-white/10 shadow-lg transition-all"
                    onClick={toggleScale}
                    title="Resize"
                >
                    <Maximize className="h-2.5 w-2.5" />
                </Button>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar p-3 bg-[#0A0A0A]/60 backdrop-blur-2xl rounded-[1.5rem] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className='relative h-20 w-32 aspect-video bg-black/40 backdrop-blur-md rounded-xl overflow-hidden shrink-0 group shadow-2xl transition-all border border-white/5 hover:border-primary/50'
                >
                    {localStream ? (
                        <VideoTile 
                            stream={localStream} 
                            username={localUserName} 
                            isLocal={true} 
                            isMuted={!isAudioEnabled} 
                            className='w-full h-full'
                            photoUrl={localUserPhotoUrl}
                            gender={localUserGender}
                            seed={authUser?.id || socket?.id}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-transparent relative">
                            <UserAvatar 
                                name={localUserName} 
                                avatarUrl={localUserPhotoUrl || undefined} 
                                gender={localUserGender}
                                seed={authUser?.id || socket?.id}
                                className="h-8 w-8 text-xs border-none" 
                            />
                        </div>
                    )}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary/90 backdrop-blur-md text-background text-[8px] font-black uppercase rounded shadow-sm z-30">You</div>
                </motion.div>

                {users.filter(u => u.id !== (authUser?.id || socket?.id)).map((u) => {
                    const s = remoteStreams.get(u.id);
                    return (
                        <motion.div 
                            key={u.id}
                            whileHover={{ scale: 1.05 }}
                            className='relative h-20 w-32 aspect-video bg-black/40 backdrop-blur-md rounded-xl overflow-hidden shrink-0 group transition-all shadow-xl border border-white/5 hover:border-white/20'
                        >
                            {s ? (
                                <VideoTile 
                                    stream={s} 
                                    username={u.name} 
                                    isLocal={false} 
                                    className='w-full h-full' 
                                    photoUrl={u.photoUrl} 
                                    gender={u.gender}
                                    seed={u.id}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-transparent relative">
                                    <UserAvatar 
                                        name={u.name} 
                                        avatarUrl={u.photoUrl || undefined}
                                        gender={u.gender} 
                                        seed={u.id}
                                        className="h-8 w-8 text-xs border-none" 
                                    />
                                </div>
                            )}
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white/90 text-[8px] font-black uppercase rounded truncate max-w-[60px] z-30">{u.name}</div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};
