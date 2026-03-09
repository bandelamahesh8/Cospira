import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Mail,
  Save,
  Upload,
  Camera,
  AlertCircle,
  X,
  Check,
  ShieldCheck,
  Activity,
  Fingerprint,
  ScanFace,
  Lock,
  KeyRound,
  ArrowRight,
  Cpu,
  Zap,
  History,
  Hash, // Added for username
  Edit3, // Added for edit buttons
  FileDigit, // Added from Code Edit
  LogOut, // Added from Code Edit
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client'; // Added from Code Edit
import useSound from 'use-sound'; // Added from Code Edit

const PRESET_SEEDS = [
  'Felix',
  'Aneka',
  'Zack',
  'Midnight',
  'Bear',
  'Tech',
  'Cospira',
  'Luna',
  'Leo',
  'Max',
  'Bella',
  'Charlie',
  'Lucy',
  'Cooper',
  'Bailey',
  'Rocky',
  'Daisy',
  'Milo',
  'Sadie',
  'Buddy',
  'Lola',
  'Jack',
  'Molly',
];

const Profile = () => {
  const { user, updateProfile, changePassword, changeEmail, checkUsernameAvailability } = useAuth();
  const { roomId, recentRooms, isConnected } = useWebSocket();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio
  const { playClick, playSuccess, playError } = useSoundEffects();

  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [gender, setGender] = useState(user?.user_metadata?.gender || 'other');
  const [photoUrl, setPhotoUrl] = useState(user?.user_metadata?.photo_url || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [username, setUsername] = useState(
    user?.user_metadata?.username || (user as any)?.username || ''
  );
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  const [usernameMessage, setUsernameMessage] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'avatar' | 'security'>('details');

  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  // Verification Dialog State
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'username' | 'email' | null>(null);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [isVerifyingAction, setIsVerifyingAction] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(3);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '');
      setGender(user.user_metadata?.gender || 'other');
      setPhotoUrl(user.user_metadata?.photo_url || '');
      setUsername(user.user_metadata?.username || (user as any)?.username || '');
      setEmailInput(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Fallback comparison just in case
      if (
        !username ||
        username === user?.user_metadata?.username ||
        username === (user as any)?.username
      ) {
        setIsUsernameAvailable(true);
        setUsernameMessage('');
        return;
      }
      if (username.length < 3) {
        setIsUsernameAvailable(false);
        setUsernameMessage('Username must be at least 3 characters');
        return;
      }

      setIsCheckingUsername(true);
      try {
        if (checkUsernameAvailability) {
          const response = await checkUsernameAvailability(username);
          if (response.available) {
            setIsUsernameAvailable(true);
            setUsernameMessage('Username is available');
          } else {
            setIsUsernameAvailable(false);
            setUsernameMessage('Username is already taken');
          }
        }
      } catch {
        setUsernameMessage('Could not verify username availability');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, user?.user_metadata?.username, (user as any)?.username, checkUsernameAvailability]);

  // Sync state when dialogs open/close
  useEffect(() => {
    if (!isUsernameDialogOpen) {
      setUsername(user?.user_metadata?.username || (user as any)?.username || '');
      setIsUsernameAvailable(true);
      setUsernameMessage('');
    }
  }, [isUsernameDialogOpen, user]);

  useEffect(() => {
    if (!isEmailDialogOpen) {
      setEmailInput(user?.email || '');
    }
  }, [isEmailDialogOpen, user]);

  // Block access if user is in a room
  if (roomId) {
    return (
      <div className='min-h-full bg-[#05070a] flex items-center justify-center p-6'>
        <div className='relative z-10 max-w-md w-full p-10 bg-[#0c1016] border border-red-500/20 rounded-[40px] text-center shadow-2xl'>
          <div className='w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]'>
            <AlertCircle className='h-10 w-10 text-red-500' />
          </div>
          <h2 className='text-3xl font-black text-white uppercase italic tracking-tighter mb-4'>
            Signal Locked
          </h2>
          <p className='text-white/40 mb-10 font-medium leading-relaxed uppercase tracking-tight text-xs'>
            Please disconnect from your active session to modify neural identity settings.
          </p>
          <div className='flex gap-4'>
            <button
              onClick={() => {
                playClick();
                navigate('/dashboard');
              }}
              className='flex-1 h-14 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-[1.02] transition-all shadow-xl'
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                playClick();
                navigate(-1);
              }}
              className='flex-1 h-14 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/5 transition-all'
            >
              Reroute
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File exceeds limits', { description: 'Max 5MB allowed for profile data.' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Invalid Format', { description: 'Please provide visual data only.' });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setActiveTab('details'); // Switch back to see result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (seed: string) => {
    const encodedSeed = encodeURIComponent(seed);
    const genderPrefix = gender === 'male' ? 'male-' : gender === 'female' ? 'female-' : '';
    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${genderPrefix}${encodedSeed}`;

    setPhotoUrl(url);
    setPhotoFile(null);
    setPreviewUrl('');
    toast.success('Visual Profile Selected');
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Identity Required', { description: 'Display name cannot be void.' });
      return;
    }

    if (
      !isUsernameAvailable &&
      username !== user?.user_metadata?.username &&
      username !== (user as any)?.username
    ) {
      toast.error('Identity Conflict', { description: 'Selected username is not available.' });
      return;
    }

    setIsLoading(true);
    try {
      let uploadedPhotoUrl = photoUrl;

      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('userId', user?.id || '');

        const response = await fetch(
          `${import.meta.env.VITE_WS_URL || 'http://localhost:3001'}/upload-profile-photo`,
          { method: 'POST', body: formData }
        );

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        uploadedPhotoUrl = data.photoUrl;
      }

      const updates: { [key: string]: any } = {
        display_name: displayName,
        gender: gender,
        photo_url: uploadedPhotoUrl,
      };

      if (username !== (user?.user_metadata?.username || (user as any)?.username)) {
        updates.username = username;
      }

      await updateProfile(updates);

      setPhotoUrl(uploadedPhotoUrl);
      setPhotoFile(null);
      setPreviewUrl('');
      playSuccess();
      toast.success('Neural Identity Updated');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch {
      playError();
      toast.error('Sync Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Security Risk', { description: 'Min 6 characters required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mismatch', { description: 'New passwords do not match.' });
      return;
    }

    setIsLoading(true);
    const { success, error } = await changePassword(currentPassword, newPassword);
    setIsLoading(false);

    if (success) {
      playSuccess();
      toast.success('Protocol Secured', { description: 'Credential change confirmed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsVerified(false); // Reset for next time
    } else {
      playError();
      toast.error('Update Failed', { description: error });
    }
  };

  const handleVerifyPassword = async () => {
    if (!currentPassword) {
      toast.error('Verification Required');
      return;
    }

    if (verificationAttempts <= 1) {
      playError();
      toast.error('Access Blocked', {
        description: 'Too many failed attempts. Identity lock initiated.',
      });
      setVerificationAttempts(0);
      return;
    }

    setIsLoading(true);
    const userEmail = user?.email || '';

    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    setIsLoading(false);

    if (!error) {
      playSuccess();
      setIsVerified(true);
      toast.success('Identity Verified', { description: 'Credential expansion authorized.' });
    } else {
      playError();
      const newAttempts = verificationAttempts - 1;
      setVerificationAttempts(newAttempts);
      toast.error('Verification Failed', {
        description: `Incorrect passkey. ${newAttempts} attempts remaining.`,
      });
    }
  };

  const handleVerifyAction = async () => {
    if (!verifyPassword) {
      toast.error('Verification Required', { description: 'Please enter your current passkey.' });
      return;
    }

    setIsVerifyingAction(true);
    const userEmail = user?.email || '';

    const { error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: verifyPassword,
    });

    setIsVerifyingAction(false);

    if (!error) {
      playSuccess();
      setIsVerifyDialogOpen(false);
      setVerifyPassword('');
      if (pendingAction === 'username') setIsUsernameDialogOpen(true);
      else if (pendingAction === 'email') setIsEmailDialogOpen(true);
      setPendingAction(null);
    } else {
      playError();
      toast.error('Verification Failed', { description: 'Invalid passkey.' });
    }
  };

  const userEmail = user?.email || 'guest@example.com';
  const currentDisplayName =
    displayName || user?.user_metadata?.display_name || userEmail.split('@')[0];
  const currentUsername =
    username || user?.user_metadata?.username || (user as any)?.username || 'user';
  const displayPhotoUrl =
    previewUrl ||
    photoUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentDisplayName}`;

  return (
    <div className='min-h-full bg-[#05070a] text-white overflow-y-auto custom-scrollbar'>
      <div className='w-full px-4 md:px-10 lg:px-12 py-8 md:py-12 space-y-12 max-w-[1600px] mx-auto pb-32'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='flex flex-col md:flex-row md:items-end justify-between gap-8'
        >
          <div className='space-y-4'>
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full'>
              <Fingerprint className='w-4 h-4 text-indigo-400' />
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200'>
                Identity Protocol
              </span>
            </div>
            <h1 className='text-4xl md:text-7xl font-black tracking-tighter text-white italic uppercase leading-none'>
              Neural <span className='text-white/20'>Profile</span>
            </h1>
            <p className='text-lg text-white/40 font-medium max-w-xl leading-relaxed uppercase tracking-tight text-sm'>
              Configure your network signature and visual matrix for seamless synchronization.
            </p>
          </div>

          <div className='flex items-center gap-4 bg-white/[0.03] border border-white/5 p-4 rounded-3xl backdrop-blur-xl'>
            <div className='flex flex-col items-end'>
              <span className='text-[9px] font-black uppercase tracking-widest text-white/20 leading-none mb-1'>
                Signal Status
              </span>
              <div className='flex items-center gap-2'>
                <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' />
                <span className='text-sm font-black text-white italic uppercase tracking-tighter'>
                  {isConnected ? 'Synchronized' : 'Standalone'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
          {/* LEFT: AVATAR CARD */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className='lg:col-span-4'
          >
            <div className='relative group rounded-[40px] bg-[#0c1016]/80 backdrop-blur-xl border border-white/5 shadow-2xl p-10 flex flex-col items-center text-center overflow-hidden'>
              <div className='absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none' />

              <div className='relative mb-8'>
                <div className='w-48 h-48 rounded-[3rem] border-4 border-[#0c1016] ring-2 ring-white/5 shadow-2xl overflow-hidden relative group-hover:scale-105 transition-transform duration-700 bg-black/20'>
                  <img src={displayPhotoUrl} alt='Avatar' className='w-full h-full object-cover' />
                </div>
                <button
                  onClick={() => {
                    playClick();
                    setActiveTab(activeTab === 'avatar' ? 'details' : 'avatar');
                  }}
                  className='absolute -bottom-2 -right-2 w-14 h-14 bg-white text-black rounded-3xl flex items-center justify-center shadow-2xl hover:bg-indigo-400 hover:text-white transition-all z-10'
                >
                  {activeTab === 'avatar' ? (
                    <X className='w-6 h-6' />
                  ) : (
                    <Camera className='w-6 h-6' />
                  )}
                </button>
              </div>

              <h3 className='text-3xl font-black text-white uppercase italic tracking-tighter mb-1 truncate w-full'>
                {currentDisplayName}
              </h3>
              <p className='text-[10px] text-white/30 font-mono uppercase tracking-[0.2em] mb-10'>
                CORE_ID: {user?.id?.substring(0, 8) || '---'}
              </p>

              <div className='w-full space-y-3'>
                <div className='p-5 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between group/stat'>
                  <div className='flex items-center gap-4'>
                    <div className='w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400'>
                      <Zap size={18} />
                    </div>
                    <span className='text-xs font-black text-white/40 uppercase tracking-widest'>
                      Protocol
                    </span>
                  </div>
                  <span className='text-xs font-black text-white italic uppercase tracking-tighter'>
                    Elite Alpha
                  </span>
                </div>
                <div className='p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between group/stat'>
                  <div className='flex items-center gap-4'>
                    <div className='w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400'>
                      <ShieldCheck size={18} />
                    </div>
                    <span className='text-xs font-black text-white/40 uppercase tracking-widest'>
                      Trust Index
                    </span>
                  </div>
                  <span className='text-xs font-black text-white italic uppercase tracking-tighter'>
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: EDIT DETAILS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className='lg:col-span-8'
          >
            <div className='bg-[#0c1016]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 md:p-12 relative overflow-hidden'>
              <div className='flex gap-8 mb-12 border-b border-white/5'>
                {[
                  { id: 'details', label: 'Neural Base', icon: Cpu },
                  { id: 'avatar', label: 'Visual Grid', icon: ScanFace },
                  { id: 'security', label: 'Lock Protocol', icon: Lock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      playClick();
                      setActiveTab(tab.id as 'details' | 'avatar' | 'security');
                    }}
                    className={`pb-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
                  >
                    <tab.icon size={14} className={activeTab === tab.id ? 'text-indigo-400' : ''} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId='profileTab'
                        className='absolute bottom-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                      />
                    )}
                  </button>
                ))}
              </div>

              <AnimatePresence mode='wait'>
                {activeTab === 'details' && (
                  <motion.div
                    key='details'
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className='space-y-10'
                  >
                    <div className='grid gap-8 max-w-2xl'>
                      <div className='space-y-3'>
                        <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/60 ml-1'>
                          DESIGNATION SIGNATURE
                        </Label>
                        <div className='relative group'>
                          <User className='absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-indigo-400 transition-colors' />
                          <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className='h-16 pl-16 bg-white/5 border-white/5 rounded-[20px] font-black text-lg text-white uppercase italic tracking-tighter focus:bg-white/[0.08] focus:border-indigo-500/30 transition-all placeholder:text-white/10'
                            placeholder='ENTER ALIAS...'
                          />
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1'>
                          NETWORK ALIAS (USERNAME)
                        </Label>
                        <div className='relative group'>
                          <span className='absolute left-6 top-1/2 -translate-y-1/2 font-mono text-xl text-white/30 group-focus-within:text-indigo-400 transition-colors'>
                            @
                          </span>
                          <Input
                            value={
                              user?.user_metadata?.username || (user as any)?.username || 'username'
                            }
                            readOnly
                            className='h-16 pl-14 pr-24 bg-white/5 border-white/5 rounded-[20px] font-mono text-sm text-white/50 cursor-not-allowed italic'
                            placeholder='username'
                          />
                          <button
                            onClick={() => {
                              setPendingAction('username');
                              setIsVerifyDialogOpen(true);
                            }}
                            className='absolute right-4 top-1/2 -translate-y-1/2 px-4 h-10 bg-indigo-500/20 text-indigo-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-indigo-500/40 transition-all flex items-center gap-2'
                          >
                            <Edit3 size={12} /> Change
                          </button>
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1'>
                          ENCRYPTED CHANNEL (EMAIL)
                        </Label>
                        <div className='relative block'>
                          <Mail className='absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-emerald-400 transition-colors' />
                          <Input
                            value={user?.email || 'guest@example.com'}
                            readOnly
                            className='h-16 pl-16 pr-24 bg-white/[0.02] border-white/5 rounded-[20px] font-mono text-sm text-white/50 cursor-not-allowed italic'
                          />
                          <button
                            onClick={() => {
                              setPendingAction('email');
                              setIsVerifyDialogOpen(true);
                            }}
                            className='absolute right-4 top-1/2 -translate-y-1/2 px-4 h-10 bg-indigo-500/20 text-indigo-400 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-indigo-500/40 transition-all flex items-center gap-2'
                          >
                            <Edit3 size={12} /> Change
                          </button>
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1'>
                          NEURAL FREQUENCY
                        </Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger className='h-16 bg-white/5 border-white/5 rounded-[20px] text-white font-black uppercase italic tracking-tighter pl-6'>
                            <SelectValue placeholder='Select frequency' />
                          </SelectTrigger>
                          <SelectContent className='bg-[#0c1016] border-white/5 text-white rounded-2xl overflow-hidden'>
                            <SelectItem value='male' className='h-12 uppercase italic font-bold'>
                              Male Signal
                            </SelectItem>
                            <SelectItem value='female' className='h-12 uppercase italic font-bold'>
                              Female Signal
                            </SelectItem>
                            <SelectItem value='other' className='h-12 uppercase italic font-bold'>
                              Neutral Matrix
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className='pt-10 flex items-center gap-4 border-t border-white/5'>
                      <motion.button
                        onClick={() => {
                          playClick();
                          handleSave();
                        }}
                        disabled={isLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className='px-10 h-16 rounded-[20px] bg-white text-black font-black uppercase tracking-widest text-[11px] flex items-center gap-3 hover:bg-indigo-400 hover:text-white transition-all shadow-2xl disabled:opacity-50'
                      >
                        {isLoading ? (
                          <span className='animate-pulse'>SYNCHRONIZING...</span>
                        ) : (
                          <>
                            <Save className='w-4 h-4' /> Commit Changes
                          </>
                        )}
                      </motion.button>
                      <button
                        onClick={() => {
                          playClick();
                          navigate('/dashboard');
                        }}
                        className='px-8 h-16 rounded-[20px] border border-white/10 text-white/20 font-black uppercase tracking-widest text-[11px] hover:text-white hover:bg-white/5 transition-all'
                      >
                        Discard
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'avatar' && (
                  <motion.div
                    key='avatar'
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className='space-y-12'
                  >
                    <div
                      className='h-48 border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:bg-white/[0.03] hover:border-indigo-500/20 transition-all cursor-pointer group'
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className='w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all text-indigo-400'>
                        <Upload className='w-6 h-6' />
                      </div>
                      <div className='text-center'>
                        <h3 className='text-xl font-black text-white italic uppercase tracking-tighter'>
                          Inject Visual Data
                        </h3>
                        <p className='text-[10px] text-white/20 mt-1 font-black uppercase tracking-[0.2em]'>
                          MAX FILESIZE: 5MB • PNG / JPG / SVG
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*'
                        onChange={handlePhotoChange}
                        className='hidden'
                      />
                    </div>

                    <div className='space-y-6'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 flex items-center gap-3'>
                          <ScanFace className='w-4 h-4 text-indigo-400' />
                          Neural Presets
                        </Label>
                        <div className='h-px flex-1 bg-white/5 ml-8' />
                      </div>
                      <div className='h-[400px] overflow-y-auto custom-scrollbar p-4 border border-white/5 rounded-3xl bg-black/20'>
                        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4'>
                          {PRESET_SEEDS.map((seed) => {
                            const genderPrefix =
                              gender === 'male' ? 'male-' : gender === 'female' ? 'female-' : '';
                            const seedUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${genderPrefix}${encodeURIComponent(seed)}`;
                            const isActive = photoUrl === seedUrl && !previewUrl;

                            return (
                              <motion.button
                                key={seed}
                                onClick={() => {
                                  playClick();
                                  handleSelectPreset(seed);
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${isActive ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'border-white/5 hover:border-white/20'}`}
                              >
                                <img
                                  src={seedUrl}
                                  alt={seed}
                                  className='w-full h-full object-cover bg-[#05070a]'
                                />
                                {isActive && (
                                  <div className='absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-sm'>
                                    <Check
                                      className='w-8 h-8 text-white drop-shadow-lg'
                                      strokeWidth={3}
                                    />
                                  </div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div
                    key='security'
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className='space-y-12 max-w-2xl'
                  >
                    <div className='grid gap-8'>
                      <div className='space-y-3'>
                        <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1'>
                          IDENTITY VERIFICATION
                        </Label>
                        <div className='relative group'>
                          <KeyRound
                            className={`absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isVerified ? 'text-emerald-400' : 'text-white/10 group-focus-within:text-indigo-400'}`}
                          />
                          <Input
                            type='password'
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isVerified || verificationAttempts === 0}
                            className={`h-16 pl-16 pr-32 bg-white/5 border-white/5 rounded-[20px] font-mono text-white transition-all placeholder:text-white/10 ${isVerified ? 'border-emerald-500/30 bg-emerald-500/5' : 'focus:bg-white/[0.08] focus:border-indigo-500/30'}`}
                            placeholder='ENTER CURRENT PASSKEY...'
                          />
                          {!isVerified && verificationAttempts > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                playClick();
                                handleVerifyPassword();
                              }}
                              disabled={isLoading || !currentPassword}
                              className='absolute right-4 top-1/2 -translate-y-1/2 px-4 h-10 bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-indigo-400 transition-all disabled:opacity-50'
                            >
                              Verify
                            </button>
                          )}
                          {isVerified && (
                            <div className='absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                              <Check className='w-5 h-5 text-emerald-400' />
                              <span className='text-[10px] font-black text-emerald-400 uppercase tracking-widest'>
                                Verified
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isVerified && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className='overflow-hidden space-y-8'
                          >
                            <div className='grid md:grid-cols-2 gap-6 pt-4'>
                              <div className='space-y-3'>
                                <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 ml-1'>
                                  NEW CREDENTIAL
                                </Label>
                                <div className='relative group'>
                                  <Lock className='absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-emerald-400 transition-colors' />
                                  <Input
                                    type='password'
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className='h-16 pl-16 bg-white/5 border-white/5 rounded-[20px] font-mono text-white focus:bg-white/[0.08] focus:border-emerald-500/30 transition-all placeholder:text-white/10'
                                    placeholder='MIN 6 CHARS...'
                                  />
                                </div>
                              </div>
                              <div className='space-y-3'>
                                <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 ml-1'>
                                  RE-VERIFY CREDENTIAL
                                </Label>
                                <div className='relative group'>
                                  <Lock className='absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-emerald-400 transition-colors' />
                                  <Input
                                    type='password'
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className='h-16 pl-16 bg-white/5 border-white/5 rounded-[20px] font-mono text-white focus:bg-white/[0.08] focus:border-emerald-500/30 transition-all placeholder:text-white/10'
                                    placeholder='REPEAT NEW PASS...'
                                  />
                                </div>
                              </div>
                            </div>

                            <motion.button
                              onClick={() => {
                                playClick();
                                handleChangePassword();
                              }}
                              disabled={isLoading}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className='w-full h-16 rounded-[20px] bg-white text-black font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-emerald-500 hover:text-white transition-all shadow-2xl disabled:opacity-50'
                            >
                              {isLoading ? (
                                <span className='animate-pulse'>RE-ENCRYPTING...</span>
                              ) : (
                                <>
                                  <ShieldCheck className='w-5 h-5' /> Execute Security Update
                                </>
                              )}
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isVerified && verificationAttempts < 3 && (
                        <p className='text-[10px] font-black uppercase tracking-widest text-red-400 italic'>
                          Verification failed. {verificationAttempts} attempts remaining before
                          identity lock.
                        </p>
                      )}
                    </div>

                    <div className='pt-10 flex flex-col gap-6 border-t border-white/5'>
                      <div className='flex items-center justify-between px-4 py-6 bg-white/[0.02] border border-white/5 rounded-3xl'>
                        <div className='flex items-center gap-3'>
                          <div className='w-2 h-2 rounded-full bg-indigo-500 animate-pulse' />
                          <span className='text-[10px] text-white/30 font-black uppercase tracking-widest'>
                            Forgotten terminal passkey?
                          </span>
                        </div>
                        <button
                          onClick={() => setShowForgotPassword(true)}
                          className='text-[10px] text-indigo-400 hover:text-white font-black uppercase tracking-[0.2em] transition-all bg-indigo-500/10 px-4 py-2 rounded-xl'
                        >
                          Initiate Recovery
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RECENT ACTIVITY / ROOMS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='lg:col-span-12 bg-[#0c1016]/60 backdrop-blur-xl border border-white/5 rounded-[40px] p-10 md:p-12 shadow-2xl relative overflow-hidden'
          >
            <div className='absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -translate-y-32 translate-x-32' />

            <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-6 border-b border-white/5'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400'>
                  <History className='w-6 h-6' />
                </div>
                <h2 className='text-3xl font-black text-white italic uppercase tracking-tighter'>
                  Engagement <span className='text-white/20'>Logs</span>
                </h2>
              </div>
              <div className='flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5'>
                <span className='text-[10px] font-black uppercase tracking-widest text-white/20'>
                  Archive Status
                </span>
                <span className='text-xs font-black text-emerald-400 uppercase tracking-tighter italic'>
                  Secured
                </span>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {!recentRooms || recentRooms.length === 0 ? (
                <div className='md:col-span-2 py-24 border border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center bg-white/[0.01]'>
                  <Activity className='w-16 h-16 text-white/5 mb-6' />
                  <span className='text-xs font-black uppercase tracking-[0.3em] text-white/20'>
                    No active signal history recorded
                  </span>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className='mt-8 px-10 h-12 bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all'
                  >
                    Initialize First Sector
                  </button>
                </div>
              ) : (
                recentRooms
                  .slice(0, 10)
                  .map((room: { id: string; name?: string; userCount?: number }, i) => (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      onClick={() => {
                        playClick();
                        navigate(`/room/${room.id}`);
                      }}
                      className='group p-6 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-indigo-500/30 rounded-[28px] flex items-center justify-between transition-all cursor-pointer relative overflow-hidden'
                    >
                      <div className='flex items-center gap-6'>
                        <div className='w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-xl'>
                          <Zap className='w-6 h-6' />
                        </div>
                        <div>
                          <h4 className='text-xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase italic tracking-tighter'>
                            {room.name || 'SECURE SECTOR'}
                          </h4>
                          <div className='flex items-center gap-3 mt-1 opacity-40'>
                            <span className='text-[10px] font-mono font-bold uppercase tracking-widest'>
                              ID: {room.id}
                            </span>
                            <div className='w-1 h-1 rounded-full bg-white/30' />
                            <span className='text-[10px] font-black uppercase tracking-widest'>
                              {room.userCount || 0} ACTIVE
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className='w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-white group-hover:text-black transition-all shadow-2xl'>
                        <ArrowRight className='w-6 h-6' />
                      </div>
                    </motion.div>
                  ))
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* --- Dialogs --- */}
      <Dialog
        open={isVerifyDialogOpen}
        onOpenChange={(open) => {
          setIsVerifyDialogOpen(open);
          if (!open) {
            setPendingAction(null);
            setVerifyPassword('');
          }
        }}
      >
        <DialogContent className='bg-[#0c1016]/95 backdrop-blur-3xl border-white/10 text-white rounded-[32px] p-8 max-w-md w-[95vw]'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase italic tracking-tighter'>
              Identity Verification
            </DialogTitle>
            <DialogDescription className='text-white/50 text-xs font-mono'>
              Please enter your current passkey to authorize this fundamental change.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-3'>
              <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 ml-1'>
                CURRENT PASSKEY
              </Label>
              <div className='relative group'>
                <KeyRound className='absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors' />
                <Input
                  type='password'
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  className='h-14 pl-12 pr-4 bg-white/5 border-white/5 rounded-2xl font-mono text-sm text-white focus:bg-white/[0.08] focus:border-indigo-500/30 transition-all placeholder:text-white/10'
                  placeholder={'••••••••'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyAction();
                  }}
                />
              </div>
            </div>
            <div className='flex justify-end gap-3 pt-4'>
              <button
                onClick={() => {
                  setIsVerifyDialogOpen(false);
                  setPendingAction(null);
                  setVerifyPassword('');
                }}
                className='px-6 py-3 rounded-xl border border-white/5 text-white/50 hover:text-white hover:bg-white/5 text-[11px] font-black uppercase tracking-widest transition-all'
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyAction}
                disabled={isVerifyingAction || !verifyPassword}
                className='px-6 py-3 rounded-xl bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50'
              >
                {isVerifyingAction ? 'Verifying...' : 'Authorize'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
        <DialogContent className='bg-[#0c1016]/95 backdrop-blur-3xl border-white/10 text-white rounded-[32px] p-8 max-w-md w-[95vw]'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase italic tracking-tighter'>
              Modify Alias
            </DialogTitle>
            <DialogDescription className='text-white/50 text-xs font-mono'>
              Enter a new network alias. Verification required.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-3'>
              <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 ml-1'>
                NEW USERNAME
              </Label>
              <div className='relative group'>
                <span className='absolute left-5 top-1/2 -translate-y-1/2 font-mono text-xl text-white/30 group-focus-within:text-indigo-400 transition-colors'>
                  @
                </span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className={`h-14 pl-12 pr-12 bg-white/5 border-white/5 rounded-2xl font-mono text-sm text-white focus:bg-white/[0.08] transition-all placeholder:text-white/10 ${!isUsernameAvailable && username !== user?.user_metadata?.username && username !== (user as any)?.username ? 'border-red-500/50 focus:border-red-500' : 'focus:border-indigo-500/30'}`}
                  placeholder='new_username'
                />
                {isCheckingUsername ? (
                  <div className='absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin' />
                ) : (
                  username !== user?.user_metadata?.username &&
                  username !== (user as any)?.username &&
                  username.length > 0 && (
                    <div className='absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                      <Check
                        className={`w-5 h-5 ${isUsernameAvailable ? 'text-emerald-400' : 'hidden'}`}
                      />
                      <AlertCircle
                        className={`w-5 h-5 ${!isUsernameAvailable ? 'text-red-500' : 'hidden'}`}
                      />
                    </div>
                  )
                )}
              </div>
              {usernameMessage &&
                username !== user?.user_metadata?.username &&
                username !== (user as any)?.username && (
                  <p
                    className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isUsernameAvailable ? 'text-emerald-400' : 'text-red-500'}`}
                  >
                    {usernameMessage}
                  </p>
                )}
            </div>
            <div className='flex justify-end gap-3 pt-4'>
              <button
                onClick={() => setIsUsernameDialogOpen(false)}
                className='px-6 py-3 rounded-xl border border-white/5 text-white/50 hover:text-white hover:bg-white/5 text-[11px] font-black uppercase tracking-widest transition-all'
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (
                    !isUsernameAvailable &&
                    username !== user?.user_metadata?.username &&
                    username !== (user as any)?.username
                  ) {
                    toast.error('Identity Conflict', {
                      description: 'Selected username is not available.',
                    });
                    return;
                  }
                  await handleSave();
                  setIsUsernameDialogOpen(false);
                }}
                disabled={
                  isLoading ||
                  isCheckingUsername ||
                  (!isUsernameAvailable &&
                    username !== user?.user_metadata?.username &&
                    username !== (user as any)?.username)
                }
                className='px-6 py-3 rounded-xl bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50'
              >
                {isLoading ? 'Updating...' : 'Update Alias'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className='bg-[#0c1016]/95 backdrop-blur-3xl border-white/10 text-white rounded-[32px] p-8 max-w-md w-[95vw]'>
          <DialogHeader className='mb-6'>
            <DialogTitle className='text-2xl font-black uppercase italic tracking-tighter'>
              Modify Channel
            </DialogTitle>
            <DialogDescription className='text-white/50 text-xs font-mono'>
              A confirmation link will be sent to the new address.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-6'>
            <div className='space-y-3'>
              <Label className='text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 ml-1'>
                NEW EMAIL ADDRESS
              </Label>
              <div className='relative group'>
                <Mail className='absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-emerald-400 transition-colors' />
                <Input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className='h-14 pl-12 pr-4 bg-white/5 border-white/5 rounded-2xl font-mono text-sm text-white focus:bg-white/[0.08] focus:border-emerald-500/30 transition-all placeholder:text-white/10'
                  placeholder='new@example.com'
                />
              </div>
            </div>
            <div className='flex justify-end gap-3 pt-4'>
              <button
                onClick={() => setIsEmailDialogOpen(false)}
                className='px-6 py-3 rounded-xl border border-white/5 text-white/50 hover:text-white hover:bg-white/5 text-[11px] font-black uppercase tracking-widest transition-all'
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!changeEmail) return;
                  setIsChangingEmail(true);
                  const { success, error } = await changeEmail(emailInput);
                  setIsChangingEmail(false);
                  if (success) {
                    toast.success('Check Inbox', {
                      description: 'Confirmation email sent to new address.',
                    });
                    setIsEmailDialogOpen(false);
                  } else {
                    toast.error('Change Failed', { description: error });
                  }
                }}
                disabled={
                  isChangingEmail || emailInput === user?.email || !emailInput.includes('@')
                }
                className='px-6 py-3 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50'
              >
                {isChangingEmail ? 'Sending...' : 'Send Link'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
