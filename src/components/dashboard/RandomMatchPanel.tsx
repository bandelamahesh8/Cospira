import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  MessageSquare,
  Coffee,
  BookOpen,
  Users,
  Gamepad2,
  ArrowRight,
  Shuffle,
  Plus,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const RandomMatchPanel = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'config' | 'permissions'>('config');

  // Config State
  const [mode, setMode] = useState<'video' | 'chat'>('video');
  const [intent, setIntent] = useState<'casual' | 'focus' | 'network' | 'play'>('casual');
  const [interests, setInterests] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Permission State
  const [isChecking, setIsChecking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      if (interests.length < 5) {
        setInterests([...interests, inputValue.trim()]);
        setInputValue('');
      }
    }
  };

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const initiateMatch = () => {
    setStep('permissions');
  };

  // Auto-check permissions when entering 'permissions' step
  const checkMediaPermissions = useCallback(async () => {
    setIsChecking(true);
    try {
      const constraints = {
        audio: true,
        video: mode === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPermissionGranted(true);

      if (previewVideoRef.current && mode === 'video') {
        previewVideoRef.current.srcObject = stream;
      }
      // Keep stream active for preview
    } catch (err) {
      console.error('Permission denied', err);
      setPermissionGranted(false);
      toast.error('Permissions denied. Please enable access.');
    } finally {
      setIsChecking(false);
    }
  }, [mode]);

  // Auto-check permissions when entering 'permissions' step
  useEffect(() => {
    if (step === 'permissions') {
      checkMediaPermissions();
    }
  }, [step, checkMediaPermissions]);

  const finalizeConnection = () => {
    if (!ageConfirmed) {
      toast.error('Please confirm your age to proceed.');
      return;
    }

    navigate('/connect', {
      state: {
        mode,
        intent,
        interests,
        preVerified: true, // Tell RandomLanding used passed checks
      },
    });
  };

  return (
    <div className='w-full bg-[#0A0D11] min-h-[400px] flex flex-col relative overflow-hidden'>
      {/* Header */}
      <div className='flex items-center justify-between px-8 py-6 border-b border-white/5 shrink-0 z-10 bg-[#0A0D11]'>
        <div className='flex items-center gap-3'>
          <Shuffle className='w-4 h-4 text-indigo-500' />
          <span className='text-xs font-black uppercase tracking-[0.2em] text-white/40'>
            {step === 'config' ? 'Protocol Configuration' : 'System Verification'}
          </span>
        </div>
        <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20'>
          <span className='relative flex h-2 w-2'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
          </span>
          <span className='text-[10px] font-bold text-emerald-500 tracking-wider'>LIVE</span>
        </div>
      </div>

      <div className='relative flex-1 p-8'>
        <AnimatePresence mode='wait'>
          {/* STEP 1: CONFIGURATION */}
          {step === 'config' && (
            <motion.div
              key='config'
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className='space-y-8'
            >
              {/* Interface Priority */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-3'>
                  <label className='text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1'>
                    Interface Priority
                  </label>
                  <div className='grid grid-cols-2 gap-4 h-14'>
                    <button
                      onClick={() => setMode('video')}
                      className={`relative rounded-xl flex items-center justify-center gap-3 transition-all border ${mode === 'video' ? 'bg-[#1E1B2E] border-indigo-500/50 ring-1 ring-indigo-500/20' : 'bg-[#11141A] border-white/5 hover:border-white/10'}`}
                    >
                      <Video
                        className={`w-4 h-4 ${mode === 'video' ? 'text-indigo-400' : 'text-white/20'}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${mode === 'video' ? 'text-white' : 'text-white/40'}`}
                      >
                        Video
                      </span>
                      {mode === 'video' && (
                        <div className='absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_currentColor]' />
                      )}
                    </button>

                    <button
                      onClick={() => setMode('chat')}
                      className={`relative rounded-xl flex items-center justify-center gap-3 transition-all border ${mode === 'chat' ? 'bg-[#1E1B2E] border-indigo-500/50 ring-1 ring-indigo-500/20' : 'bg-[#11141A] border-white/5 hover:border-white/10'}`}
                    >
                      <MessageSquare
                        className={`w-4 h-4 ${mode === 'chat' ? 'text-indigo-400' : 'text-white/20'}`}
                      />
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${mode === 'chat' ? 'text-white' : 'text-white/40'}`}
                      >
                        Chat
                      </span>
                      {mode === 'chat' && (
                        <div className='absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_currentColor]' />
                      )}
                    </button>
                  </div>
                </div>

                <div className='space-y-3'>
                  <label className='text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1'>
                    Common Interests (Optional)
                  </label>
                  <div className='h-14 bg-[#11141A] border border-white/5 rounded-xl flex items-center px-4 relative focus-within:border-white/20 transition-colors'>
                    <div className='flex gap-2 mr-2 overflow-x-auto no-scrollbar max-w-[60%]'>
                      {interests.map((tag, i) => (
                        <span
                          key={i}
                          className='shrink-0 h-6 px-2 bg-white/10 rounded flex items-center gap-1 text-[10px] font-bold uppercase text-white cursor-pointer hover:bg-white/20'
                          onClick={() => removeInterest(i)}
                        >
                          {tag} <X size={10} />
                        </span>
                      ))}
                    </div>
                    <input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={interests.length === 0 ? '+ Add keyword...' : ''}
                      className='flex-1 bg-transparent border-none outline-none text-xs font-bold text-white uppercase placeholder:text-white/20 min-w-[100px]'
                    />
                    {inputValue && (
                      <button
                        onClick={() => {
                          if (inputValue.trim()) {
                            setInterests([...interests, inputValue.trim()]);
                            setInputValue('');
                          }
                        }}
                        className='absolute right-3 p-1 rounded-md bg-white/10 hover:bg-white/20 text-white'
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Connect Intent & Action */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8 items-end'>
                <div className='space-y-3'>
                  <label className='text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1'>
                    Connect Intent
                  </label>
                  <div className='grid grid-cols-4 gap-3 h-20'>
                    {[
                      {
                        id: 'casual',
                        icon: Coffee,
                        label: 'Casual',
                        color: 'text-emerald-400',
                        activeBg: 'bg-emerald-500/10',
                        border: 'border-emerald-500/50',
                      },
                      {
                        id: 'focus',
                        icon: BookOpen,
                        label: 'Focus',
                        color: 'text-amber-400',
                        activeBg: 'bg-amber-500/10',
                        border: 'border-amber-500/50',
                      },
                      {
                        id: 'network',
                        icon: Users,
                        label: 'Network',
                        color: 'text-blue-400',
                        activeBg: 'bg-blue-500/10',
                        border: 'border-blue-500/50',
                      },
                      {
                        id: 'play',
                        icon: Gamepad2,
                        label: 'Play',
                        color: 'text-fuchsia-400',
                        activeBg: 'bg-fuchsia-500/10',
                        border: 'border-fuchsia-500/50',
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() =>
                          setIntent(item.id as 'casual' | 'focus' | 'network' | 'play')
                        }
                        className={`flex flex-col items-center justify-center gap-2 rounded-xl border transition-all ${intent === item.id ? `${item.activeBg} ${item.border}` : 'bg-[#11141A] border-white/5 hover:border-white/10'}`}
                      >
                        <item.icon
                          className={`w-5 h-5 ${intent === item.id ? item.color : 'text-white/20'}`}
                        />
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest ${intent === item.id ? 'text-white' : 'text-white/30'}`}
                        >
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className='h-20'>
                  <motion.button
                    onClick={initiateMatch}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className='w-full h-full bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 group shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all'
                  >
                    <span>Initiate Match</span>
                    <ArrowRight className='w-5 h-5 bg-black text-white rounded-full p-1 transition-transform group-hover:translate-x-1' />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: PERMISSIONS & CHECKS */}
          {step === 'permissions' && (
            <motion.div
              key='permissions'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className='h-full flex flex-col md:flex-row gap-8 items-center justify-center'
            >
              {/* Preview Card */}
              <div className='w-full md:w-1/2 aspect-video bg-black rounded-xl overflow-hidden relative border border-white/10 shadow-2xl'>
                {isChecking ? (
                  <div className='absolute inset-0 flex flex-col items-center justify-center bg-[#0F1219]'>
                    <Loader2 className='w-8 h-8 text-indigo-500 animate-spin mb-4' />
                    <p className='text-white/40 font-mono text-xs uppercase tracking-widest'>
                      Verifying Hardware...
                    </p>
                  </div>
                ) : permissionGranted ? (
                  mode === 'video' ? (
                    <video
                      ref={previewVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className='w-full h-full object-cover transform scale-x-[-1]'
                    />
                  ) : (
                    <div className='absolute inset-0 flex flex-col items-center justify-center bg-[#0F1219]'>
                      <div className='w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4'>
                        <MessageSquare className='w-8 h-8' />
                      </div>
                      <p className='text-white/60 font-medium'>Audio Input Active</p>
                      <div className='mt-4 flex gap-1 h-4 items-end'>
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className='w-1 bg-indigo-500 animate-pulse rounded-full'
                            style={{
                              height: Math.random() * 16 + 4,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className='absolute inset-0 flex flex-col items-center justify-center bg-[#0F1219] p-6 text-center'>
                    <AlertTriangle className='w-10 h-10 text-amber-500 mb-4' />
                    <p className='text-white font-bold mb-2'>Permission Required</p>
                    <p className='text-white/40 text-xs mb-4'>Please allow access to continue.</p>
                    <button
                      onClick={checkMediaPermissions}
                      className='px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase transition-colors'
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className='absolute top-3 right-3 px-2 py-1 bg-black/60 rounded backdrop-blur-md border border-white/10 flex items-center gap-2'>
                  <div
                    className={`w-2 h-2 rounded-full ${permissionGranted ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                  <span className='text-[10px] font-bold uppercase text-white/60'>
                    {permissionGranted ? 'SYSTEMS NOMINAL' : 'CHECKING...'}
                  </span>
                </div>
              </div>

              {/* Verification Controls */}
              <div className='w-full md:w-1/2 space-y-6'>
                <div className='space-y-4'>
                  <h3 className='text-xl font-bold text-white'>Final Verification</h3>

                  <div
                    onClick={() => setAgeConfirmed(!ageConfirmed)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex gap-4 items-start group ${ageConfirmed ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-[#151922] border-white/5 hover:border-white/10'}`}
                  >
                    <div
                      className={`mt-1 p-1 rounded border ${ageConfirmed ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-white/20 text-transparent'}`}
                    >
                      <CheckCircle size={12} fill='currentColor' />
                    </div>
                    <div>
                      <p className='text-sm font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors'>
                        I accept the Terms of Engagement
                      </p>
                      <p className='text-xs text-white/40 leading-relaxed'>
                        By proceeding, I verify that I am 18+ years of age and agree to follow the
                        community safety guidelines. Inappropriate behavior results in an immediate
                        ban.
                      </p>
                    </div>
                  </div>
                </div>

                <div className='flex gap-4 pt-4'>
                  <button
                    onClick={() => setStep('config')}
                    className='px-6 h-14 rounded-xl border border-white/10 text-white/40 font-bold text-xs uppercase hover:bg-white/5 hover:text-white transition-all'
                  >
                    Back
                  </button>
                  <button
                    onClick={finalizeConnection}
                    disabled={!permissionGranted || !ageConfirmed}
                    className='flex-1 h-14 bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                  >
                    <span>Establish Uplink</span>
                    <ShieldCheck className='w-5 h-5' />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
