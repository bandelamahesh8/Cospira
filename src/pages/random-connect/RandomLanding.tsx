import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video as VideoIcon,
  MessageSquare,
  Mic,
  MicOff,
  VideoOff,
  SkipForward,
  Square,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Send,
  Play,
  Globe,
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageLayout } from '@/components/PageLayout';
import { logger } from '@/utils/logger';
import { NeuralInformer } from '@/components/intelligence';

type ConnectionState = 'idle' | 'age-check' | 'permissions' | 'searching' | 'connected';

const RandomLanding = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Config from Dashboard
  const {
    mode = 'video',
    intent = 'casual',
    interests = [],
    preVerified = false,
  } = location.state || {};

  const {
    socket,
    users,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    messages,
    sendMessage,
    leaveRoom,
    user,
    isMediaLoading,
    toggleAudio,
    toggleVideo,
    enableMedia,
    disableMedia, // NEW
  } = useWebSocket();

  // Initialize state based on preVerified value
  const [state, setState] = useState<ConnectionState>(preVerified ? 'searching' : 'idle');
  const [permissionGranted, setPermissionGranted] = useState(preVerified);
  const [ageConfirmed, setAgeConfirmed] = useState(preVerified);
  const [termsConfirmed, setTermsConfirmed] = useState(preVerified);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);

  // Local Chat State
  const [newMessage, setNewMessage] = useState('');

  const [mediaWarning, setMediaWarning] = useState(false);

  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);

  // Refs
  // const previewVideoRef = useRef<HTMLVideoElement>(null); // Removed to use callback ref pattern
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage(newMessage);
    setNewMessage('');
  };

  // Auto-start flow logic if preVerified
  useEffect(() => {
    if (preVerified && state === 'searching' && !socket?.connected) {
      // socket handled by context, we wait for ready state
      enableMedia(); // Ensure media is enabled if pre-verified
    }
  }, [preVerified, state, socket, enableMedia]);

  // Handle Permissions Selection
  useEffect(() => {
    if (state === 'permissions' && !preVerified) {
      const checkMedia = async () => {
        setIsCheckingPermissions(true);
        try {
          const constraints = {
            audio: true,
            video: mode === 'video',
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setPermissionGranted(true);
          setPreviewStream(stream);
        } catch (_err) {
          setPermissionGranted(false);
          toast.error('Permissions denied. Please enable access.');
        } finally {
          setIsCheckingPermissions(false);
        }
      };
      checkMedia();
    }
  }, [state, mode, preVerified]);

  const isHandingOverRef = useRef(false);

  // Cleanup preview stream on state change
  useEffect(() => {
    return () => {
      // Only stop preview tracks if we aren't handing them over to the main stream
      if (previewStream && !isHandingOverRef.current) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewStream]);

  // Force DISCONNECT on Unmount (Back button / Navigation)
  useEffect(() => {
    return () => {
      // When user leaves the page entirely, kill all media
      if (!isHandingOverRef.current) {
        logger.debug('[RandomLanding] Unmounting, disabling all media');
        disableMedia();
      }
      // Reset flag
      isHandingOverRef.current = false;
    };
  }, [disableMedia]);

  // Browser-level PROTECTION (Tab Close / Refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state !== 'idle') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave the matching session?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  // Queue logic matches
  useEffect(() => {
    if (state === 'searching' && socket) {
      socket.emit('join_random_queue', { mode, interests, intent });
    }
  }, [state, socket, mode, intent, interests]);

  // NEW: Media Enforcement Logic
  useEffect(() => {
    // Don't enforce if loose or if loading
    if (isMediaLoading) {
      setMediaWarning(false);
      return;
    }

    // Enforce in Connected or Searching states
    if (state === 'connected' || state === 'searching') {
      const missingVideo = mode === 'video' && !isVideoEnabled;
      // Strict audio check
      const missingAudio = !isAudioEnabled;

      if (missingVideo || missingAudio) {
        setMediaWarning(true);
      } else {
        setMediaWarning(false);
      }
    } else {
      setMediaWarning(false);
    }
  }, [state, isAudioEnabled, isVideoEnabled, mode, isMediaLoading]);

  const handleConfirmLegal = () => {
    if (!ageConfirmed || !termsConfirmed) return;
    setState('permissions'); // Proceed to Permissions
  };

  const handleProceedSearch = async () => {
    if (!permissionGranted) {
      toast.error('Permissions required to proceed.');
      return;
    }
    setIsProceeding(true);
    try {
      // Note: handover is currently not supported by enableMedia implementation,
      // so we pass booleans and it will re-acquire the stream.
      if (previewStream) {
        isHandingOverRef.current = true; // Set flag to prevent cleanup
        await enableMedia(true, mode === 'video');
        setPreviewStream(null);
      } else {
        await enableMedia(true, mode === 'video');
      }
      setState('searching');
    } catch (_error) {
      toast.error('Failed to initialize media.');
    } finally {
      setIsProceeding(false);
    }
  };

  const handleStop = () => {
    setState('idle');
    leaveRoom();
    if (socket) socket.emit('leave_queue');
  };

  // NEW: Leave handler
  const handleLeave = () => {
    const confirmed = window.confirm(
      'Are you sure you want to leave the matching session? This will disconnect your audio and video.'
    );
    if (!confirmed) return;

    // 1. Explicitly disable all local media
    disableMedia();

    // 2. Clear preview stream just in case (redundant but safe)
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop());
      setPreviewStream(null);
    }

    // 3. Stop matching logic and navigate
    handleStop();
    navigate('/dashboard');
  };

  const handleStart = async () => {
    if (preVerified) {
      setState('searching');
    } else {
      // Start the flow
      setState('age-check');
    }
  };

  const handleSkip = () => {
    setState('searching');
    leaveRoom();
    if (socket) socket.emit('skip_user', { mode, interests, intent });
  };

  // Match listener
  useEffect(() => {
    if (!socket) return;
    const onMatch = (data: { roomId: string; method?: string }) => {
      logger.info('[RandomLanding] Match Found, navigating to room:', data.roomId);
      isHandingOverRef.current = true; // Set flag to prevent cleanup
      setState('connected');
      toast.success('Match Found! Connecting...');

      // Navigate to the room page
      // We don't call disableMedia here because it's handled by the cleanup hook with handover check
      navigate(`/room/${data.roomId}`, {
        state: {
          method: data.method || 'random',
          connectionType: 'casual',
        },
      });
    };
    socket.on('match_found', onMatch);
    return () => {
      socket.off('match_found', onMatch);
    };
  }, [socket, navigate]);

  // --- RENDERS ---
  return (
    <PageLayout showNavbar={false} showSidebar={false} className='p-0 overflow-hidden' noPadding>
      <div className='h-screen w-full flex flex-col font-sans overflow-hidden relative'>
        {/* Media Warning Overlay */}
        <AnimatePresence>
          {mediaWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-[100] bg-[#050505]/95 flex items-center justify-center p-4 font-sans backdrop-blur-sm'
            >
              <div className='w-full max-w-md bg-[#0A0D11] border border-red-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl'>
                <div className='w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse'>
                  <VideoOff className='w-10 h-10 text-red-500' />
                </div>
                <div>
                  <h2 className='text-2xl font-black text-white uppercase tracking-tight mb-2'>
                    Media Signal Lost
                  </h2>
                  <p className='text-red-400 font-medium tracking-wide'>
                    Camera and Microphone Access Required
                  </p>
                  <p className='text-white/40 text-sm mt-3 leading-relaxed'>
                    System protocols require active media streams for global matching. Please
                    re-enable your hardware.
                  </p>
                </div>

                <div className='flex justify-center gap-4 pt-4'>
                  <NeuralInformer
                    title='Audio Signal Uplink'
                    description='Toggle your neural audio transmitter. When enabled, your voice will be broadcast to the matching partner over an encrypted frequency.'
                  >
                    <button
                      id='media-retry-audio-modal'
                      onClick={toggleAudio}
                      className={`p-5 rounded-2xl border transition-all ${!isAudioEnabled ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/20 border-emerald-500 text-emerald-500'}`}
                    >
                      {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                  </NeuralInformer>
                  {mode === 'video' && (
                    <NeuralInformer
                      title='Visual Stream Protocol'
                      description='Toggle your high-definition video capture. Cospira protocols require visual streams for verified random connections.'
                    >
                      <button
                        id='media-retry-video-modal'
                        onClick={toggleVideo}
                        className={`p-5 rounded-2xl border transition-all ${!isVideoEnabled ? 'bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/20 border-emerald-500 text-emerald-500'}`}
                      >
                        {isVideoEnabled ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                      </button>
                    </NeuralInformer>
                  )}
                </div>

                <button
                  id='leave-media-fail-modal-btn'
                  onClick={handleLeave}
                  className='w-full py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all rounded-2xl border border-white/5'
                >
                  ABORT SESSION
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* State-based Overlays (System Checks) */}
        <AnimatePresence mode='wait'>
          {state === 'permissions' && (
            <motion.div
              key='permissions'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-50 bg-[#050505] flex items-center justify-center p-4'
            >
              <div className='w-full max-w-md bg-[#0A0D11] border border-white/10 rounded-3xl p-8 text-center space-y-6'>
                <div className='w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse'>
                  {isCheckingPermissions ? (
                    <Loader2 className='w-8 h-8 text-indigo-500 animate-spin' />
                  ) : permissionGranted ? (
                    <CheckCircle className='w-8 h-8 text-emerald-500' />
                  ) : (
                    <AlertTriangle className='w-8 h-8 text-amber-500' />
                  )}
                </div>
                <h2 className='text-2xl font-black text-white uppercase tracking-tight'>
                  System Check
                </h2>
                {permissionGranted ? (
                  <div className='space-y-6'>
                    <p className='text-emerald-400 font-bold'>Systems nominal.</p>
                    {mode === 'video' && (
                      <div className='aspect-video bg-black rounded-xl overflow-hidden relative border border-white/10'>
                        <video
                          ref={(node) => {
                            if (node && previewStream) {
                              node.srcObject = previewStream;
                            }
                          }}
                          autoPlay
                          muted
                          playsInline
                          className='w-full h-full object-cover transform scale-x-[-1]'
                        />
                      </div>
                    )}
                    <button
                      id='p-proceed-btn'
                      onClick={handleProceedSearch}
                      disabled={isProceeding}
                      className='w-full h-12 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-gray-200 transition-colors flex items-center justify-center gap-2'
                    >
                      {isProceeding ? <Loader2 className='animate-spin w-4 h-4' /> : 'Proceed'}
                    </button>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    <p className='text-red-400 font-bold'>Access Denied</p>
                    <button
                      id='p-retry-btn'
                      onClick={() => navigate(0)}
                      className='px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-bold text-xs uppercase'
                    >
                      Retry Check
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {state === 'age-check' && (
            <motion.div
              key='age-check'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='fixed inset-0 z-50 bg-[#050505] flex items-center justify-center p-4'
            >
              <div className='w-full max-w-md bg-[#0A0D11] border border-red-500/20 rounded-3xl p-8 space-y-8 relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-red-500' />
                <div className='text-center space-y-2'>
                  <AlertTriangle className='w-12 h-12 text-red-500 mx-auto mb-4' />
                  <h2 className='text-2xl font-black text-white uppercase tracking-tight'>
                    Restricted Access
                  </h2>
                  <p className='text-white/40 text-sm'>Verification required.</p>
                </div>
                <div className='space-y-4 bg-red-500/5 p-6 rounded-2xl border border-red-500/10'>
                  <div className='flex items-start gap-4'>
                    <Checkbox
                      id='age'
                      checked={ageConfirmed}
                      onCheckedChange={(c) => setAgeConfirmed(c === true)}
                      className='mt-1 border-red-500/50 data-[state=checked]:bg-red-500 data-[state=checked]:text-white'
                    />
                    <label
                      htmlFor='age'
                      className='text-sm font-bold text-white uppercase tracking-wide leading-none cursor-pointer'
                    >
                      I confirm I am 18+ years old
                    </label>
                  </div>
                  <div className='flex items-start gap-4'>
                    <Checkbox
                      id='terms'
                      checked={termsConfirmed}
                      onCheckedChange={(c) => setTermsConfirmed(c === true)}
                      className='mt-1 border-red-500/50 data-[state=checked]:bg-red-500 data-[state=checked]:text-white'
                    />
                    <label
                      htmlFor='terms'
                      className='text-sm font-bold text-white uppercase tracking-wide leading-none cursor-pointer'
                    >
                      I accept the Terms & Conditions
                    </label>
                  </div>
                </div>
                <div className='flex gap-4'>
                  <button
                    id='age-cancel-btn'
                    onClick={handleLeave}
                    className='flex-1 h-12 bg-transparent hover:bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white font-bold text-xs uppercase transition-colors'
                  >
                    Cancel
                  </button>
                  <button
                    id='age-confirm-btn'
                    onClick={handleConfirmLegal}
                    disabled={!ageConfirmed || !termsConfirmed}
                    className='flex-1 h-12 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest transition-all'
                  >
                    Enter
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        {/* Premium Dark Header */}
        <header className='h-16 bg-[#0A0D11]/80 backdrop-blur-md border-b border-white/5 px-6 flex items-center justify-between shrink-0 z-20'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20'>
              <Globe className='text-white w-5 h-5' />
            </div>
            <span className='text-xl font-black text-white tracking-tight'>
              COSPIRA<span className='text-indigo-500'>.LIVE</span>
            </span>
          </div>
          <div className='flex items-center gap-4'>
            <div className='hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5'>
              <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
              <span className='text-xs font-bold text-white/60 uppercase tracking-wider'>
                {Object.keys(users).length + 4000} Online
              </span>
            </div>
          </div>
        </header>

        <div className='flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden max-w-[1800px] mx-auto w-full'>
          {/* LEFT COLUMN: VIDEOS (Stacked) */}
          <div className='flex-1 flex flex-col gap-4 min-w-0'>
            {/* TOP: Remote Video Area */}
            <div className='flex-1 bg-[#111] rounded-2xl overflow-hidden relative shadow-2xl border border-white/5 group ring-1 ring-white/5'>
              {state === 'connected' && Array.from(remoteStreams.values())[0] ? (
                <video
                  id='remote-video-feed'
                  ref={(ref) => {
                    if (ref) ref.srcObject = Array.from(remoteStreams.values())[0];
                  }}
                  autoPlay
                  playsInline
                  className='w-full h-full object-cover'
                />
              ) : state === 'searching' ? (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-[#0A0D11]'>
                  <div className='relative'>
                    <div className='w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6' />
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <Globe className='w-8 h-8 text-indigo-500/50' />
                    </div>
                  </div>
                  <h3 className='text-2xl font-black text-white uppercase tracking-wider animate-pulse'>
                    Scanning Sector...
                  </h3>
                  <p className='text-indigo-400/60 font-mono text-sm mt-3 tracking-widest'>
                    CONNECTING TO PARTNER
                  </p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0D11] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                  <VideoIcon className='w-20 h-20 text-white/5 mb-6' />
                  <h3 className='text-xl font-bold text-white mb-2 tracking-wide'>
                    Waiting for Command
                  </h3>
                  <p className='text-white/30 tracking-widest text-sm uppercase'>
                    Click Start to Begin
                  </p>
                </div>
              )}

              <div className='absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10'>
                <span
                  className={`w-2 h-2 rounded-full ${state === 'connected' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-500'}`}
                />
                <span className='text-white font-bold text-[10px] tracking-widest uppercase'>
                  REMOTE FEED
                </span>
              </div>
            </div>

            {/* BOTTOM: Local Video Area */}
            <div className='flex-1 bg-[#111] rounded-2xl overflow-hidden relative shadow-2xl border border-white/5 ring-1 ring-white/5'>
              {mode === 'video' ? (
                <video
                  id='local-video-feed'
                  ref={(ref) => {
                    if (ref && localStream) ref.srcObject = localStream;
                  }}
                  autoPlay
                  muted
                  playsInline
                  className='w-full h-full object-cover transform scale-x-[-1]'
                />
              ) : (
                <div className='absolute inset-0 flex items-center justify-center bg-[#1a1d21]'>
                  <p className='text-white/30 font-bold uppercase tracking-widest'>
                    Camera Disabled
                  </p>
                </div>
              )}

              <div className='absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10'>
                <span className='w-2 h-2 rounded-full bg-emerald-500' />
                <span className='text-white font-bold text-[10px] tracking-widest uppercase'>
                  YOU
                </span>
              </div>

              <div className='absolute top-4 right-4 flex gap-2'>
                <NeuralInformer
                  title='Mic Interface'
                  description='Control your voice broadcast status. Signals are processed through low-latency neural buffers.'
                >
                  <button
                    id='t-audio-btn'
                    onClick={toggleAudio}
                    className={`p-2.5 rounded-xl backdrop-blur-md border border-white/10 transition-all ${isAudioEnabled ? 'bg-black/40 text-white hover:bg-black/60' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
                  >
                    {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                  </button>
                </NeuralInformer>
                {mode === 'video' && (
                  <NeuralInformer
                    title='Video Capture'
                    description='Toggle active optical transmission. Protocols require active streams for continuous sector alignment.'
                  >
                    <button
                      id='t-video-btn'
                      onClick={toggleVideo}
                      className={`p-2.5 rounded-xl backdrop-blur-md border border-white/10 transition-all ${isVideoEnabled ? 'bg-black/40 text-white hover:bg-black/60' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
                    >
                      {isVideoEnabled ? <VideoIcon size={18} /> : <VideoOff size={18} />}
                    </button>
                  </NeuralInformer>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CHAT & CONTROLS (Fixed Width on Desktop) */}
          <div className='w-full lg:w-[400px] xl:w-[450px] bg-[#0A0D11] rounded-2xl shadow-2xl border border-white/5 flex flex-col overflow-hidden shrink-0 ring-1 ring-white/5'>
            <div className='h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0F1216]'>
              <div className='flex items-center gap-2'>
                <div
                  className={`w-2 h-2 rounded-full ${state === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : state === 'searching' ? 'bg-indigo-500 animate-pulse' : 'bg-gray-500'}`}
                />
                <span className='text-xs font-bold text-white uppercase tracking-widest'>
                  {state === 'connected'
                    ? 'Connected'
                    : state === 'searching'
                      ? 'Scanning...'
                      : 'Idle'}
                </span>
              </div>
              <div className='flex items-center gap-1.5 text-white/40'>
                <Globe size={14} />
                <span className='text-[10px] font-bold uppercase tracking-widest'>
                  Global Relay
                </span>
              </div>
            </div>

            <ScrollArea className='flex-1 bg-[#0A0D11] p-4'>
              <div className='space-y-4'>
                <div className='text-center py-12'>
                  <div className='w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-white/20'>
                    <MessageSquare size={24} />
                  </div>
                  <p className='text-white/20 text-xs font-bold uppercase tracking-widest'>
                    Encrypted Channel Ready
                  </p>
                </div>

                {messages.map((msg, i) => {
                  const isMe = msg.userId === (user?.id || 'me');
                  const isSystem = msg.userId === 'system';
                  if (isSystem) {
                    return (
                      <div key={i} className='flex justify-center my-4'>
                        <span className='text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full'>
                          {msg.content}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] px-4 py-3 text-sm font-medium ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-lg shadow-indigo-500/10' : 'bg-[#1A1D21] text-gray-200 border border-white/5 rounded-2xl rounded-tl-sm'}`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className='p-4 bg-[#0F1216] border-t border-white/5 space-y-4'>
              <div className='flex gap-3'>
                {state === 'idle' ? (
                  <NeuralInformer
                    title='Initialize Search'
                    description='Begin the neural scanning process. This will broadcast your signal to the global matching pool based on your selected interests.'
                  >
                    <button
                      id='start-match-btn'
                      onClick={handleStart}
                      className='h-12 w-full min-w-[120px] bg-white text-black hover:bg-gray-200 font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 transition-all tracking-wide'
                    >
                      <Play size={18} fill='currentColor' /> Start
                    </button>
                  </NeuralInformer>
                ) : (
                  <NeuralInformer
                    title='Terminate Search'
                    description='Disconnect from the matching queue and cease active signal broadcasting. This will halt all ongoing search protocols.'
                  >
                    <button
                      id='stop-match-btn'
                      onClick={handleStop}
                      className='h-12 w-full min-w-[120px] bg-[#1A1D21] hover:bg-[#25282D] text-white border border-white/10 font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 transition-all tracking-wide'
                    >
                      <Square size={18} fill='currentColor' /> Stop
                    </button>
                  </NeuralInformer>
                )}

                <NeuralInformer
                  title='Skip/Cycle Protocol'
                  description='Immediately disconnect from the current signal and re-enter the queue. A new connection will be established within seconds.'
                >
                  <button
                    id='next-match-btn'
                    onClick={handleSkip}
                    className='h-12 w-full min-w-[120px] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 tracking-wide'
                  >
                    Next <SkipForward size={18} fill='currentColor' />
                  </button>
                </NeuralInformer>
              </div>

              <div className='flex gap-3'>
                <NeuralInformer
                  title='Abort Link'
                  description='Fully disconnect from the Cospira.LIVE mesh. This will disable all media hardware and revert you to the command dashboard.'
                >
                  <button
                    id='leave-random-btn'
                    onClick={handleLeave}
                    className='h-11 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-black text-xs uppercase transition-all tracking-wide'
                  >
                    Leave
                  </button>
                </NeuralInformer>

                <div className='h-11 px-4 bg-[#1A1D21] border border-white/5 rounded-xl flex items-center justify-center min-w-[120px] cursor-pointer hover:bg-[#25282D] transition-colors'>
                  <div className='flex items-center gap-2 text-white/60'>
                    <span className='text-[10px] font-bold uppercase tracking-wider'>
                      All Genders
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSendMessage} className='flex gap-2 relative'>
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder='Type a secure message...'
                  className='flex-1 h-12 bg-[#050505] border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium'
                />
                <button
                  id='send-random-msg-btn'
                  type='submit'
                  disabled={!newMessage.trim()}
                  className='absolute right-1 top-1 h-10 w-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-0 disabled:scale-95 transform duration-200'
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default RandomLanding;
