import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useWebSocket } from '@/hooks/useWebSocket';
import { RecentRoomsCard } from '@/components/dashboard/RecentRoomsCard';

import { NeuralInformer } from '@/components/intelligence';
import { GuestNotification } from '@/components/GuestNotification';
import {
  AdvancedRoomSettings,
  type AdvancedSettings,
} from '@/components/rooms/AdvancedRoomSettings';
import {
  Zap,
  Shuffle,
  ArrowRight,
  Globe,
  Gamepad2,
  Briefcase,
  RefreshCw,
  Users,
  Shield,
  Lock,
  Loader2,
  LogIn,
  Hash,
  Link as LinkIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { encodeRoomId } from '@/utils/roomCode';
import { normalizeRoomMode } from '@/services/RoomIntelligence';

const Dashboard = () => {
  const { createRoom, isAiActive } = useWebSocket();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'encrypted'>('public');
  const [mode, setMode] = useState<'fun' | 'pro' | 'ultra' | 'mixed'>('fun');
  const [matchMode, setMatchMode] = useState<'video' | 'chat'>('video');
  const [intent, setIntent] = useState<'casual' | 'focus' | 'network' | 'play'>('casual');
  const [interests, setInterests] = useState('');

  const [isCreateOpen, setCreateOpen] = useState(true);
  const [isJoinOpen, setJoinOpen] = useState(false);
  const [isGlobalOpen, setGlobalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    invite_only: false,
    join_by_link: true,
    join_by_code: true,
    host_only_code_visibility: false,
    waiting_lobby: false,
    organization_only: false,
    host_controlled_speaking: false,
    chat_permission: 'everyone',
    encryption_enabled: false,
    ai_moderation_level: 'off',
    auto_close_minutes: 0,
    smart_room_mode: 'free',
    neural_protocols_enabled: false,
    require_reapproval_on_rejoin: false,
  });

  const handleCreate = async () => {
    if (!roomName.trim()) {
      toast.error('Sector Name Required');
      return;
    }

    if ((mode === 'pro' || mode === 'ultra') && !password.trim()) {
      toast.error('Security Protocol Alert', {
        description: `${mode.toUpperCase()} mode requires a password.`,
      });
      return;
    }

    setIsInitializing(true);
    const roomId = Math.random().toString(36).substring(7).toUpperCase();

    try {
      await new Promise<void>((resolve) => {
        createRoom(
          roomId,
          roomName,
          password,
          privacy === 'public' ? 'public' : 'password',
          () => {
            resolve();
            const encodedId = encodeRoomId(roomId);
            navigate(`/dashboard/room/${encodedId}`);
          },
          undefined,
          { ...advancedSettings, mode: normalizeRoomMode(mode) }
        );

        // Safety timeout to reset state if something goes wrong
        setTimeout(() => {
          setIsInitializing(false);
          resolve();
        }, 8000); // Give it a bit more time as user said it takes ~3s
      });
    } catch (_error) {
      setIsInitializing(false);
    }
  };

  const handleJoin = () => {
    if (!roomCode.trim()) {
      toast.error('Entry Code Required');
      return;
    }

    // Handle full invite links by extracting the code
    let targetCode = roomCode.trim();
    if (targetCode.includes('/room/')) {
      const parts = targetCode.split('/room/');
      targetCode = parts[1].split('?')[0].split('/')[0];
    }

    navigate(`/dashboard/room/${targetCode.toUpperCase()}`);
  };

  return (
    <div className='flex flex-col h-full bg-[#05060a] relative overflow-hidden font-sans'>
      {/* AI Mode Neural Glow */}
      <AnimatePresence>
        {isAiActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className='fixed inset-0 pointer-events-none z-0'
          >
            <div className='absolute inset-0 bg-indigo-500/5 backdrop-blur-[1px]' />
            <div className='absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/[0.06] rounded-full blur-[140px] animate-pulse' />
            <div
              className='absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[140px] animate-pulse'
              style={{ animationDelay: '1.5s' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className='flex-1 overflow-y-auto custom-scrollbar pt-8 px-2 pb-2 relative z-10'>
        {/* Guest Notification */}
        <div className='mb-4 px-2'>
          <GuestNotification />
        </div>

        {/* Dashboard Title Section */}
        <div className='flex flex-col md:flex-row items-start justify-between gap-8 mb-8'>
          <div>
            <div className='flex items-center gap-4 mb-2'>
              <div className='h-px w-8 bg-blue-500' />
              <span className='text-[10px] font-bold text-blue-400 uppercase tracking-widest'>
                Command Center
              </span>
            </div>
            <h2 className='text-5xl font-black text-white italic uppercase tracking-tighter mb-2'>
              DASHBOARD
            </h2>
            <p className='text-zinc-500 font-medium'>
              Welcome, <span className='text-white'>Architect</span>. System running smoothly.
            </p>
          </div>
        </div>

        {/* Main Configuration Area */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start relative z-20'>
          {/* Create Room Header Card */}
          <NeuralInformer
            title='Neural Sector Creation'
            description="Configure and initialize a private or public sector. Tailor the environment with high-performance protocols like 'Pro' or 'Ultra' for specific collaboration needs."
          >
            <div
              onClick={() => {
                setJoinOpen(false);
                setGlobalOpen(false);
                setCreateOpen(!isCreateOpen);
              }}
              className={`bg-white rounded-[24px] h-[80px] w-full flex items-center px-6 relative shadow-[0_0_20px_rgba(255,255,255,0.03)] cursor-pointer group transition-all hover:scale-[1.02] active:scale-[0.98] ${isCreateOpen ? 'ring-2 ring-blue-500/50' : 'opacity-90 hover:opacity-100'}`}
            >
              <div className='w-10 h-10 rounded-xl bg-black flex items-center justify-center mr-4 shadow-xl'>
                <Zap className='w-5 h-5 text-white fill-white' />
              </div>
              <div className='flex-1'>
                <span className='text-lg font-black text-black uppercase tracking-tight leading-none block'>
                  CREATE ROOM
                </span>
                <span className='text-[10px] font-bold text-black/40 uppercase tracking-widest block'>
                  Sector Name
                </span>
              </div>
              <ArrowRight
                className={`w-5 h-5 text-black/30 transition-transform duration-300 ${isCreateOpen ? 'rotate-90' : 'group-hover:translate-x-1'}`}
              />
            </div>
          </NeuralInformer>

          {/* Join Room Header Card */}
          <NeuralInformer
            title='Direct Access Uplink'
            description='Input a secure room code or use a direct invitation link to synchronize with an existing neural sector across the Cospira mesh.'
          >
            <div
              onClick={() => {
                setCreateOpen(false);
                setGlobalOpen(false);
                setJoinOpen(!isJoinOpen);
              }}
              className={`bg-[#0A0D14] border border-white/5 rounded-[24px] h-[80px] w-full flex items-center px-6 relative shadow-[0_0_25px_rgba(59,130,246,0.07)] cursor-pointer group transition-all hover:border-blue-500/30 ${isJoinOpen ? 'border-blue-500/50 bg-[#0F1219]' : ''}`}
            >
              <div className='w-10 h-10 rounded-xl bg-[#1A1D24] border border-white/5 flex items-center justify-center mr-4 relative z-10 text-blue-400'>
                <LogIn
                  className={`w-5 h-5 transition-transform duration-500 ${isJoinOpen ? 'scale-110' : ''}`}
                />
              </div>
              <div className='flex-1 relative z-10'>
                <span className='text-lg font-black text-white uppercase tracking-tight leading-none block'>
                  JOIN ROOM
                </span>
                <span className='text-[10px] font-bold text-blue-500/50 uppercase tracking-widest block'>
                  Access Uplink
                </span>
              </div>
              <ArrowRight
                className={`w-5 h-5 text-white/10 relative z-10 transition-transform duration-300 ${isJoinOpen ? 'rotate-90' : 'group-hover:translate-x-1'}`}
              />
            </div>
          </NeuralInformer>

          {/* Global Match Header Card */}
          <NeuralInformer
            title='Global Neural Mesh'
            description='Initiate a randomized connection across the global network. Match with agents based on shared interests or casual interaction intent.'
          >
            <div
              onClick={() => {
                setCreateOpen(false);
                setJoinOpen(false);
                setGlobalOpen(!isGlobalOpen);
              }}
              className={`bg-[#0F0F15] border border-white/5 rounded-[24px] h-[80px] w-full flex items-center px-6 relative shadow-[0_0_25px_rgba(139,92,246,0.07)] cursor-pointer group transition-all hover:border-purple-500/30 ${isGlobalOpen ? 'border-purple-500/50 bg-[#0F0F15]' : ''}`}
            >
              <div
                className={`absolute inset-0 rounded-[24px] bg-white/[0.03] transition-opacity duration-300 ${isGlobalOpen ? 'opacity-100' : 'opacity-50'}`}
              />
              <div className='w-10 h-10 rounded-xl bg-[#1A1A24] border border-white/5 flex items-center justify-center mr-4 relative z-10'>
                <Shuffle
                  className={`w-5 h-5 text-purple-400 transition-transform duration-500 ${isGlobalOpen ? 'rotate-180' : ''}`}
                />
              </div>
              <div className='flex-1 relative z-10'>
                <span className='text-lg font-black text-white uppercase tracking-tight leading-none block'>
                  Global Match
                </span>
                <span className='text-[10px] font-bold text-purple-500/50 uppercase tracking-widest block'>
                  Connect Across Global
                </span>
              </div>
              <ArrowRight
                className={`w-5 h-5 text-white/10 relative z-10 transition-transform duration-300 ${isGlobalOpen ? 'rotate-90' : 'group-hover:translate-x-1'}`}
              />
            </div>
          </NeuralInformer>
        </div>

        {/* Expandable Content Area - Full Width */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${isCreateOpen || isJoinOpen || isGlobalOpen ? 'grid-rows-[1fr] mb-8' : 'grid-rows-[0fr] mb-0'}`}
        >
          <div className='overflow-hidden'>
            {/* Create Room Content */}
            {isCreateOpen && (
              <div className='space-y-6 animate-in fade-in slide-in-from-top-4 duration-300'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {/* Left Side: Inputs */}
                  <div className='space-y-4'>
                    {/* Room Name Input */}
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Room Name
                      </label>
                      <div className='bg-[#0F1116] border border-white/5 focus-within:border-white/20 transition-colors rounded-2xl h-[60px] flex items-center px-6'>
                        <input
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          placeholder='SECTOR NAME'
                          className='bg-transparent border-none outline-none text-sm font-bold text-white uppercase tracking-widest p-0 h-auto placeholder:text-zinc-700 w-full focus:ring-0'
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Password
                      </label>
                      <div className='bg-[#0F1116] border border-white/5 focus-within:border-white/20 transition-colors rounded-2xl h-[60px] flex items-center px-6'>
                        <input
                          type='password'
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={
                            mode === 'pro' || mode === 'ultra'
                              ? 'PASSWORD (REQUIRED)'
                              : 'PASSWORD (OPTIONAL)'
                          }
                          className='bg-transparent border-none outline-none text-sm font-bold text-white uppercase tracking-widest p-0 h-auto placeholder:text-zinc-700 w-full focus:ring-0'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Privacy & Protocol */}
                  <div className='space-y-4'>
                    {/* Privacy Toggle */}
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Privacy Access
                      </label>
                      <div className='grid grid-cols-2 gap-4'>
                        <button
                          onClick={() => setPrivacy('public')}
                          className={`h-[60px] rounded-xl flex items-center px-4 gap-3 border transition-all ${privacy === 'public' ? 'bg-[#062C1E] border-emerald-500/30' : 'bg-[#0F1116] border-white/5 opacity-50'}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${privacy === 'public' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-zinc-500'}`}
                          >
                            <Globe className='w-4 h-4' />
                          </div>
                          <div className='text-left leading-none'>
                            <div
                              className={`text-[10px] font-black uppercase ${privacy === 'public' ? 'text-white' : 'text-zinc-500'}`}
                            >
                              Public Sector
                            </div>
                            <div className='text-[8px] font-bold text-emerald-500/50 uppercase tracking-wider'>
                              Open Uplink
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => setPrivacy('encrypted')}
                          className={`h-[60px] rounded-xl flex items-center px-4 gap-3 border transition-all ${privacy === 'encrypted' ? 'bg-[#1e1b4b] border-indigo-500/30' : 'bg-[#0F1116] border-white/5 opacity-50'}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${privacy === 'encrypted' ? 'bg-indigo-500/20 text-indigo-500' : 'bg-white/5 text-zinc-500'}`}
                          >
                            <Shield className='w-4 h-4' />
                          </div>
                          <div className='text-left leading-none'>
                            <div
                              className={`text-[10px] font-black uppercase ${privacy === 'encrypted' ? 'text-white' : 'text-zinc-500'}`}
                            >
                              Encrypted
                            </div>
                            <div className='text-[8px] font-bold text-indigo-500/50 uppercase tracking-wider'>
                              Passkey Locked
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Protocol Toggle */}
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Sector Protocol
                      </label>
                      <div className='grid grid-cols-4 gap-4'>
                        {['fun', 'pro', 'ultra', 'mixed'].map((m) => {
                          let infoTitle = '';
                          let infoDesc = '';

                          if (m === 'fun') {
                            infoTitle = 'Social/Gaming Protocol';
                            infoDesc =
                              'Optimized for social high-engagement. Open security and casual gaming presets enabled.';
                          } else if (m === 'pro') {
                            infoTitle = 'Professional Collaboration';
                            infoDesc =
                              'Low-latency screensharing and high-fidelity audio. Forced encryption for secure data exchange.';
                          } else if (m === 'ultra') {
                            infoTitle = 'High-Bandwidth Performance';
                            infoDesc =
                              'Advanced SFU routing for 4K streams. Sub-50ms latency for critical real-time operations.';
                          } else if (m === 'mixed') {
                            infoTitle = 'Versatile Neural State';
                            infoDesc =
                              'Automatically balances resources between social interaction and professional tooling.';
                          }

                          return (
                            <NeuralInformer key={m} title={infoTitle} description={infoDesc}>
                              <button
                                onClick={() => {
                                  const newMode = m as 'fun' | 'pro' | 'ultra' | 'mixed';
                                  setMode(newMode);
                                  if (newMode === 'pro' || newMode === 'ultra') {
                                    setPrivacy('encrypted');
                                  } else {
                                    setPrivacy('public'); // Optional: reset to public for fun/mixed
                                  }
                                }}
                                className={`h-[60px] w-full rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${mode === m ? 'bg-[#151226] border-purple-500/30' : 'bg-[#0F1116] border-white/5 opacity-50'}`}
                              >
                                {m === 'fun' && (
                                  <Gamepad2
                                    className={`w-3 h-3 ${mode === m ? 'text-purple-500' : 'text-zinc-600'}`}
                                  />
                                )}
                                {m === 'pro' && (
                                  <Briefcase
                                    className={`w-3 h-3 ${mode === m ? 'text-blue-500' : 'text-zinc-600'}`}
                                  />
                                )}
                                {m === 'ultra' && (
                                  <Lock
                                    className={`w-3 h-3 ${mode === m ? 'text-red-500' : 'text-zinc-600'}`}
                                  />
                                )}
                                {m === 'mixed' && (
                                  <Shuffle
                                    className={`w-3 h-3 ${mode === m ? 'text-amber-500' : 'text-zinc-600'}`}
                                  />
                                )}
                                <span
                                  className={`text-[9px] font-black uppercase tracking-widest ${mode === m ? 'text-white' : 'text-zinc-600'}`}
                                >
                                  {m}
                                </span>
                              </button>
                            </NeuralInformer>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings Toggle */}
                <div className='flex items-center justify-between py-2 border-t border-white/5'>
                  <div className='flex items-center gap-2'>
                    <RefreshCw
                      className={`w-3 h-3 text-blue-500 transition-transform duration-700 ${showAdvanced ? 'rotate-180' : ''}`}
                    />
                    <span className='text-[9px] font-black text-white uppercase tracking-[0.2em]'>
                      Advanced Neural Protocols
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`px-4 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${showAdvanced ? 'bg-blue-500 border-blue-400 text-black' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'}`}
                  >
                    {showAdvanced ? 'Configure Mini' : 'Expand Advanced'}
                  </button>
                </div>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className='overflow-hidden'
                    >
                      <AdvancedRoomSettings
                        settings={advancedSettings}
                        onChange={setAdvancedSettings}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <NeuralInformer
                  title='Neural Sector Initialization'
                  description='Finalize system configurations and broadcast the room to the Cospira mesh. This will create a permanent node for collaboration.'
                  className='w-full relative block'
                >
                  <button
                    onClick={handleCreate}
                    disabled={!roomName.trim() || isInitializing}
                    className={`w-full h-14 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 ${roomName.trim() && !isInitializing ? 'bg-white text-black hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-[0.98]' : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed'}`}
                  >
                    {isInitializing ? (
                      <>
                        <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
                        <span>Creating Sector...</span>
                      </>
                    ) : (
                      'Initialize System'
                    )}
                  </button>
                </NeuralInformer>
              </div>
            )}

            {/* Join Room Content */}
            {isJoinOpen && (
              <div className='space-y-6 animate-in fade-in slide-in-from-top-4 duration-300'>
                <div className='flex flex-col md:flex-row items-center gap-6'>
                  {/* Left Side: Room Code Input */}
                  <div className='flex-1 w-full space-y-4'>
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Entry Protocol
                      </label>
                      <div className='bg-[#0F1116] border border-white/5 focus-within:border-blue-500/30 transition-all rounded-2xl h-[60px] flex items-center px-6 gap-4'>
                        <Hash className='w-4 h-4 text-blue-500/50' />
                        <input
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                          placeholder='ENTER SECTOR CODE...'
                          className='bg-transparent border-none outline-none text-sm font-bold text-white uppercase tracking-[0.2em] p-0 h-auto placeholder:text-zinc-700 w-full focus:ring-0'
                        />
                      </div>
                    </div>
                    <div className='px-4'>
                      <p className='text-[9px] text-zinc-500 font-medium'>
                        Entering a valid signal frequency will bypass public discovery.
                      </p>
                    </div>
                  </div>

                  {/* OR Separator */}
                  <div className='flex flex-row md:flex-col items-center gap-3 opacity-30'>
                    <div className='h-px w-8 md:w-px md:h-10 bg-white' />
                    <div className='text-[10px] font-black text-white uppercase tracking-tighter'>
                      OR
                    </div>
                    <div className='h-px w-8 md:w-px md:h-10 bg-white' />
                  </div>

                  {/* Right Side: Link Input/Explanation */}
                  <div className='flex-1 w-full space-y-4'>
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Direct Invite Link
                      </label>
                      <div className='bg-[#0F1116] border border-white/5 focus-within:border-blue-500/30 transition-all rounded-2xl h-[60px] flex items-center px-6 gap-4'>
                        <LinkIcon className='w-4 h-4 text-blue-500/50' />
                        <input
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                          placeholder='PASTE INVITE URL...'
                          className='bg-transparent border-none outline-none text-xs font-bold text-white uppercase tracking-widest p-0 h-auto placeholder:text-zinc-700 w-full focus:ring-0 opacity-60'
                        />
                      </div>
                    </div>
                    <div className='px-4'>
                      <p className='text-[9px] text-zinc-500 font-medium italic'>
                        Auto-extracting sector ID from beams.
                      </p>
                    </div>
                  </div>
                </div>

                <NeuralInformer
                  title='Secure Uplink Protocol'
                  description='Enter a verified signal frequency or invite link to join an existing sector. Advanced handshake algorithms ensure a stable and encrypted connection to the target mesh.'
                  className='w-full relative block'
                >
                  <button
                    onClick={handleJoin}
                    disabled={!roomCode.trim()}
                    className={`w-full h-14 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-[0_0_15px_rgba(59,130,246,0.06)] flex items-center justify-center gap-3 ${roomCode.trim() ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]' : 'bg-[#15171E] text-white/10 border border-white/5 cursor-not-allowed'}`}
                  >
                    Establish Connection <ArrowRight className='w-4 h-4' />
                  </button>
                </NeuralInformer>
              </div>
            )}

            {/* Global Match Content */}
            {isGlobalOpen && (
              <div className='space-y-6 animate-in fade-in slide-in-from-top-4 duration-300'>
                {/* Sub-Header with Badge */}
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <Shuffle className='w-3 h-3 text-indigo-500' />
                    <span className='text-[9px] font-black text-white uppercase tracking-widest'>
                      Protocol Configuration
                    </span>
                  </div>
                  <div className='bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md flex items-center gap-1.5'>
                    <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
                    <span className='text-[8px] font-bold text-emerald-500 uppercase tracking-wider'>
                      3 Live Agents
                    </span>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {/* Left Side: Priority & Interests */}
                  <div className='space-y-4'>
                    {/* Interface Priority */}
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Interface Priority
                      </label>
                      <div className='grid grid-cols-2 gap-4'>
                        <button
                          onClick={() => setMatchMode('video')}
                          className={`h-[60px] rounded-xl flex items-center justify-center gap-2 border transition-all ${matchMode === 'video' ? 'bg-[#1e1b4b] border-indigo-500/30 text-white' : 'bg-[#0F1116] border-white/5 text-zinc-500 hover:bg-white/5'}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${matchMode === 'video' ? 'bg-indigo-500 shadow-[0_0_6px_#6366f1]' : 'bg-transparent'}`}
                          />
                          <span className='text-xs font-black uppercase tracking-wider'>VIDEO</span>
                        </button>
                        <button
                          onClick={() => setMatchMode('chat')}
                          className={`h-[60px] rounded-xl flex items-center justify-center gap-2 border transition-all ${matchMode === 'chat' ? 'bg-[#1e1b4b] border-indigo-500/30 text-white' : 'bg-[#0F1116] border-white/5 text-zinc-500 hover:bg-white/5'}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${matchMode === 'chat' ? 'bg-indigo-500 shadow-[0_0_6px_#6366f1]' : 'bg-transparent'}`}
                          />
                          <span className='text-xs font-black uppercase tracking-wider'>CHAT</span>
                        </button>
                      </div>
                    </div>

                    {/* Common Interests */}
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Common Interests (Optional)
                      </label>
                      <div className='bg-[#0F1116] border border-white/5 focus-within:border-white/20 transition-colors rounded-2xl h-[60px] flex items-center px-6'>
                        <input
                          value={interests}
                          onChange={(e) => setInterests(e.target.value)}
                          placeholder='+ ADD KEYWORD...'
                          className='bg-transparent border-none outline-none text-xs font-bold text-white uppercase tracking-widest p-0 w-full placeholder:text-zinc-700 focus:ring-0'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Connect Intent */}
                  <div className='space-y-4'>
                    {/* Connect Intent */}
                    <div>
                      <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-4 mb-2 block'>
                        Connect Intent
                      </label>
                      <div className='grid grid-cols-2 gap-4'>
                        {[
                          { id: 'casual', icon: Globe, label: 'Casual' },
                          { id: 'focus', icon: Briefcase, label: 'Focus' },
                          { id: 'network', icon: Users, label: 'Network' },
                          { id: 'play', icon: Gamepad2, label: 'Play' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() =>
                              setIntent(item.id as 'casual' | 'focus' | 'network' | 'play')
                            }
                            className={`h-[60px] rounded-xl flex items-center px-4 gap-3 border transition-all ${intent === item.id ? 'bg-[#062C1E] border-emerald-500/30 text-emerald-500' : 'bg-[#0F1116] border-white/5 text-zinc-600 hover:bg-white/5'}`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${intent === item.id ? 'bg-emerald-500/20' : 'bg-white/5'}`}
                            >
                              <item.icon className='w-4 h-4' />
                            </div>
                            <span className='text-[10px] font-black uppercase tracking-widest'>
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Button Right */}
                <NeuralInformer
                  title='Global Neural Handshake'
                  description='Initialize a real-time link with another active agent in the Cospira grid. Matches are determined by sector intent and interest alignment for high-integrity interaction.'
                  className='w-full relative block'
                >
                  <button
                    onClick={() =>
                      navigate('/connect', {
                        state: {
                          mode: matchMode,
                          intent,
                          interests: interests.split(',').filter(Boolean),
                        },
                      })
                    }
                    className='w-full h-14 rounded-xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs transition-all hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2'
                  >
                    RANDOM CHAT <ArrowRight className='w-4 h-4' />
                  </button>
                </NeuralInformer>
              </div>
            )}
          </div>
        </div>

        {/* Recent Rooms List */}
        <div className='mt-8'>
          <RecentRoomsCard
            filterType='private'
            title='Private Rooms'
            subtitle='Your Private Network Log'
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
