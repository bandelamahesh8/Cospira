import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Signal } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/utils/logger';

interface VideoTileProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isMuted?: boolean;
  className?: string;
  photoUrl?: string | null;
  gender?: string;
  seed?: string;
  isVideoEnabled?: boolean; // Explicit control from signaling
  hideName?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  username,
  isLocal = false,
  isMuted = false,
  className = '',
  photoUrl,
  gender,
  seed,
  isVideoEnabled,
  hideName = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  // Handle video track
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    // Logic: If isVideoEnabled is provided (boolean), use it. 
    // Otherwise fallback to track detection
    const videoTrack = stream?.getVideoTracks()[0];
    const shouldShowVideo = isVideoEnabled !== undefined 
        ? (isVideoEnabled && !!videoTrack)
        : (!!videoTrack && videoTrack.readyState === 'live');

    if (!shouldShowVideo) {
      videoEl.srcObject = null;
      setHasVideo(false);
      return;
    }

    // Set source
    if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
    }
    
    // Explicitly set attributes that help with mobile/safari and black screens
    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('webkit-playsinline', 'true');
    videoEl.muted = isLocal;

    const handleLoadedMetadata = () => {
        logger.debug(`[VideoTile] Metadata loaded for ${username}, size: ${videoEl.videoWidth}x${videoEl.videoHeight}`);
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
            setHasVideo(true);
            videoEl.play().catch(err => {
                logger.warn(`[VideoTile] Play failed for ${username}:`, err);
            });
        }
    };

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Force a check if it's already ready
    if (videoEl.readyState >= 2) {
        handleLoadedMetadata();
    }

    // Secondary attempt if metadata doesn't fire immediately
    const playTimeout = setTimeout(() => {
        if (videoEl.srcObject === stream && !hasVideo && videoEl.videoWidth > 0) {
            setHasVideo(true);
            videoEl.play().catch(() => {});
        }
    }, 1000);

    return () => {
      videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      clearTimeout(playTimeout);
    };
  }, [stream, username, isVideoEnabled, isLocal, hasVideo]);

  // Handle audio track separately (critical for audio-only streams, e.g. mobile mic → web)
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!stream || !audioEl || isLocal) {
      if (audioEl) audioEl.srcObject = null;
      return;
    }
    const audioTrack = stream.getAudioTracks?.()?.[0] || null;
    if (!audioTrack || audioTrack.readyState === 'ended') {
      if (audioEl) audioEl.srcObject = null;
      return;
    }

    const audioStream = new MediaStream([audioTrack]);
    audioEl.srcObject = audioStream;
    audioEl.volume = 1.0;
    audioEl.muted = isMuted;
    audioEl.autoplay = true;
    audioEl.playsInline = true;

    const tryPlay = (el: HTMLAudioElement) => {
      const p = el.play();
      if (p !== undefined) {
        p.catch((err) => {
          if (import.meta.env.DEV) {
            logger.warn('[VideoTile] Audio autoplay failed:', err);
          }
        });
      }
    };

    tryPlay(audioEl);
    // Retry play after a short delay (helps when track becomes live shortly after attach)
    const t = setTimeout(() => {
      if (audioRef.current?.srcObject === audioStream && audioRef.current?.paused) {
        tryPlay(audioRef.current);
      }
    }, 300);

    return () => {
      clearTimeout(t);
      if (audioEl) audioEl.srcObject = null;
    };
  }, [stream, isLocal, isMuted]);

  return (
    <div 
        className={`relative w-full h-full overflow-hidden bg-[#05070a] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] group ${className}`}
    >
        {/* Hidden audio element for remote audio playback */}
        {!isLocal && (
          <audio ref={audioRef} autoPlay playsInline className="hidden" />
        )}
        
        {/* Multi-user hint: Subtle Grid Background */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.03] pointer-events-none" />

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
            hasVideo ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } ${isLocal ? 'scale-x-[-1]' : ''}`}
        />

        <AnimatePresence>
            {!hasVideo && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center z-10"
                >
                    {/* Live Presence Rings */}
                    <div className="relative">
                        {!isMuted && (
                            <>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0, 0.1] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.05, 0, 0.05] }}
                                    transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-full bg-primary/10 blur-2xl"
                                />
                            </>
                        )}
                        
                        <div className="relative z-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <UserAvatar
                                name={username}
                                avatarUrl={photoUrl || undefined}
                                gender={gender}
                                seed={seed}
                                className="h-28 w-28 md:h-32 md:w-32 border-4 border-[#0A0A0A] shadow-2xl"
                            />
                            
                            {/* Status Indicator on Avatar */}
                            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-[3px] border-[#0A0A0A] flex items-center justify-center ${
                                isMuted ? 'bg-red-500' : 'bg-green-500'
                            }`}>
                                {isMuted ? (
                                    <MicOff className="w-3 h-3 text-white" />
                                ) : (
                                    <Mic className="w-3 h-3 text-white" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contextual Micro-text */}
                    <div className="mt-6 flex flex-col items-center gap-1">
                        {!hideName && (
                            <span className="text-xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                                {username}
                            </span>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full backdrop-blur-md">
                            <div className={`w-1.5 h-1.5 rounded-full ${isMuted ? 'bg-red-500/50' : 'bg-emerald-500 animate-pulse'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                {isMuted ? 'Signal Muted' : 'Live Signal Active'}
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Overlay UI (Video State) */}
        {hasVideo && (
            <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 bg-gradient-to-b from-black/60 via-transparent to-black/80 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="flex justify-between items-start">
                    <div className="flex px-3 py-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                            {isLocal ? 'Local Feed' : (`Remote Feed ${hideName ? '' : `• ${username}`}`)}
                        </span>
                    </div>
                </div>
            </div>
        )}
        
        {/* Always visible nameplate for video state (minimized) */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
            <div className="flex flex-col">
                {!hideName && <h3 className="text-lg font-black text-white uppercase tracking-tight shadow-black drop-shadow-lg">{username}</h3>}
                {hasVideo ? (
                     <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Signal className="w-3 h-3" /> Transmitting
                    </span>
                ) : (
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1.5">
                        <Signal className="w-3 h-3 opacity-30" /> Link Ready • Waiting for Feed
                    </span>
                )}
            </div>
        </div>
    </div>
  );
};

export default VideoTile;
