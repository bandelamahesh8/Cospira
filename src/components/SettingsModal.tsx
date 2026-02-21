import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  LogOut,
  ShieldAlert,
  Lock,
  Trash2,
  Copy,
  Check,
  Globe,
  X,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';

interface SettingsModalProps {
  roomId: string;
  isHost: boolean;
  trigger?: React.ReactNode;
}

const SettingsModal = ({ roomId, isHost, trigger }: SettingsModalProps) => {
  const {
    leaveRoom,
    disbandRoom,
    updateRoomSettings,
    roomName: currentRoomName,
    toggleRoomLock,
    isRoomLocked,
    hasWaitingRoom,
    accessType,
    inviteToken,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    changeVideoDevice,
    changeAudioDevice,
    isNoiseSuppressionEnabled,
    toggleNoiseSuppression,
    isAutoFramingEnabled,
    toggleAutoFraming,
  } = useWebSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // --- Device Enumeration ---
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (open) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        });
    }
  }, [open]);



  const [mode, setMode] = useState<'public' | 'private' | 'barrier'>('public');
  // Local state for password input when in private mode
  const [newPassword, setNewPassword] = useState('');
  
  useEffect(() => {
    if (open) {
      // Determine initial mode
      if (hasWaitingRoom) {
        setMode('barrier');
      } else if (accessType === 'password') {
        setMode('private');
        setNewPassword(''); 
      } else {
        setMode('public');
      }
    }
  }, [open, currentRoomName, accessType, hasWaitingRoom]);

  const handleLeave = () => {
    leaveRoom();
    navigate('/dashboard');
  };

  const copyInviteToken = () => {
    if (inviteToken) {
      navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}?token=${inviteToken}`);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className='w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white'>
            <Settings className='h-5 w-5' />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className='w-[85vw] max-w-[380px] md:max-w-[420px] max-h-[75vh] md:max-h-[85vh] flex flex-col luxury-glass border-white/5 bg-black/80 backdrop-blur-3xl p-0 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-gradient [&>button]:hidden rounded-2xl md:rounded-3xl'>
        <div className="absolute inset-x-0 top-0 h-16 md:h-24 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        
        <DialogHeader className='p-3 md:p-5 pb-2 relative z-10 shrink-0'>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-0.5 flex items-center gap-1.5">
                    <Zap className="w-2.5 h-2.5 md:w-3 md:h-3" /> Core Config
                </span>
                <DialogTitle className='text-lg md:text-2xl font-black uppercase italic tracking-tighter text-white'>
                    ARENA <span className="text-luxury">SYSTEMS</span>
                </DialogTitle>
            </div>
            <button 
                onClick={() => setOpen(false)}
                className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white"
            >
                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className='p-3 md:p-5 pt-0 space-y-3 md:space-y-4 overflow-y-auto flex-1 custom-scrollbar relative z-10'>
          
          {/* Media Settings (Always Visible) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-2 md:space-y-3'>
                <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2'>
                    <div className="h-px w-3 md:w-4 bg-primary/20" />
                    Devices
                </h4>

                <div className='space-y-2 p-3 bg-white/5 rounded-xl border border-white/5'>
                    {/* Camera Selector */}
                    <div className='space-y-1'>
                        <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1'>Camera</Label>
                        <select 
                            className='w-full h-8 md:h-10 bg-black/40 border border-white/10 rounded-lg text-[10px] md:text-xs text-white px-2 focus:ring-1 focus:ring-primary/50 outline-none'
                            value={selectedVideoDeviceId || ''}
                            onChange={(e) => changeVideoDevice(e.target.value)}
                        >
                            {videoDevices.length === 0 && <option value="">Default Camera</option>}
                            {videoDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Mic Selector */}
                    <div className='space-y-1'>
                        <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1'>Microphone</Label>
                        <select 
                            className='w-full h-8 md:h-10 bg-black/40 border border-white/10 rounded-lg text-[10px] md:text-xs text-white px-2 focus:ring-1 focus:ring-primary/50 outline-none'
                            value={selectedAudioDeviceId || ''}
                            onChange={(e) => changeAudioDevice(e.target.value)}
                        >
                            {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                            {audioDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Mic ${device.deviceId.slice(0, 5)}...`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
          </motion.div>


          {/* Neural Link (AI Features) - Power User Overrides */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className='space-y-2 md:space-y-3'>
                <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-purple-400/40 flex items-center gap-2'>
                    <div className="h-px w-3 md:w-4 bg-purple-500/20" />
                    Neural Link
                </h4>
                <div className='p-2 md:p-3 bg-purple-500/5 rounded-lg border border-purple-500/10 space-y-3'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <div className='w-5 h-5 md:w-6 md:h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400'>
                                <Zap className='w-2.5 h-2.5 md:w-3 md:h-3' />
                            </div>
                            <div className='flex flex-col'>
                                <Label className='text-[9px] md:text-[10px] font-black text-purple-400 uppercase'>Noise Cancellation</Label>
                                <span className='text-[6px] md:text-[8px] font-bold text-purple-400/40 tracking-widest uppercase'>Voice Isolation</span>
                            </div>
                        </div>
                        <Switch checked={isNoiseSuppressionEnabled} onCheckedChange={toggleNoiseSuppression} className="data-[state=checked]:bg-purple-500 scale-75 origin-right" />
                    </div>
                    
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <div className='w-5 h-5 md:w-6 md:h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400'>
                                <Zap className='w-2.5 h-2.5 md:w-3 md:h-3' />
                            </div>
                            <div className='flex flex-col'>
                                <Label className='text-[9px] md:text-[10px] font-black text-purple-400 uppercase'>Auto Framing</Label>
                                <span className='text-[6px] md:text-[8px] font-bold text-purple-400/40 tracking-widest uppercase'>Target Tracking</span>
                            </div>
                        </div>
                        <Switch checked={isAutoFramingEnabled} onCheckedChange={toggleAutoFraming} className="data-[state=checked]:bg-purple-500 scale-75 origin-right" />
                    </div>
                </div>
          </motion.div>

          {/* Host Protocols */}
          {isHost && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='space-y-2 md:space-y-3'>
                <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2'>
                    <div className="h-px w-3 md:w-4 bg-primary/20" />
                    Admin
                </h4>

                <div className='grid gap-2 md:gap-3 p-2 md:p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 shadow-inner'>
                    <div className='space-y-1'>
                        <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-1.5'>
                            Ident Key <Lock className="w-2 h-2 md:w-2.5 md:h-2.5 opacity-50" />
                        </Label>
                        <Input
                            value={currentRoomName || ''}
                            readOnly
                            disabled
                            className='h-8 md:h-10 bg-white/5 border-white/5 rounded-lg text-[10px] md:text-xs font-bold tracking-tight px-2 md:px-3 text-white/30 cursor-not-allowed selection:bg-transparent'
                        />
                    </div>

                    <div className='space-y-1'>
                        <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1'>Access Mode</Label>
                        <div className='grid grid-cols-3 gap-1.5 md:gap-2'>
                            {[
                                { id: 'public', label: 'PUBLIC', icon: Globe, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
                                { id: 'private', label: 'PRIVATE', icon: Lock, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
                                { id: 'barrier', label: 'BARRIER', icon: ShieldAlert, color: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/5' }
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setMode(t.id as 'public' | 'private' | 'barrier')}
                                    className={`
                                        h-10 md:h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all duration-300
                                        ${mode === t.id ? `${t.border} ${t.bg} shadow-lg` : 'border-white/5 bg-white/5 text-white/20 hover:bg-white/10'}
                                    `}
                                >
                                    <t.icon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${mode === t.id ? t.color : ''}`} />
                                    <span className={`text-[6px] md:text-[8px] font-black tracking-[0.15em] ${mode === t.id ? 'text-white' : ''}`}>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'private' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className='space-y-1 md:space-y-2 pt-1'>
                            <div className="space-y-1">
                                <Label className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-amber-500/60 ml-1">Password</Label>
                                <Input
                                    type='password'
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder='Set new password...'
                                    className='h-8 md:h-10 bg-amber-500/5 border-amber-500/20 rounded-lg text-[10px] md:text-xs font-bold tracking-tight px-2 md:px-3 focus:border-amber-500/50 transition-all'
                                />
                            </div>
                        </motion.div>
                    )}
                    
                    {mode === 'barrier' && (
                         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className='space-y-1 md:space-y-2 pt-1'>
                            <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                                <p className="text-[9px] text-primary/80 font-medium text-center">
                                    Users must request to join. You will receive a popup to admit them.
                                </p>
                            </div>
                         </motion.div>
                    )}

                    {inviteToken && (
                        <div className='space-y-1 pt-2 border-t border-white/5'>
                            <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-indigo-400/60 ml-1'>Invite Link</Label>
                            <div className='flex gap-2'>
                                <Input readOnly value={`${window.location.origin}/room/${roomId}?token=${inviteToken}`} className='h-8 md:h-10 bg-indigo-500/5 border-indigo-500/20 rounded-lg text-[8px] md:text-[10px] font-medium px-2 md:px-3 text-white/40' />
                                <button onClick={copyInviteToken} className='w-8 h-8 md:w-10 md:h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-all shadow-lg active:scale-95 shrink-0'>
                                    {copiedToken ? <Check className='w-3 h-3 md:w-3.5 md:h-3.5' /> : <Copy className='w-3 h-3 md:w-3.5 md:h-3.5' />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
          )}



          {/* Master Killswitches */}
          {isHost && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className='space-y-2 md:space-y-3'>
                <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-red-500/40 flex items-center gap-2'>
                    <div className="h-px w-3 md:w-4 bg-red-500/20" />
                    Security
                </h4>
                <div className='p-2 bg-red-500/5 rounded-lg border border-red-500/10 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <div className='w-5 h-5 md:w-6 md:h-6 rounded-md bg-red-500/10 flex items-center justify-center text-red-500'>
                            <Lock className='w-2.5 h-2.5 md:w-3 md:h-3' />
                        </div>
                        <div className='flex flex-col'>
                            <Label className='text-[9px] md:text-[10px] font-black text-red-500 italic uppercase'>Lockdown</Label>
                            <span className='text-[6px] md:text-[8px] font-bold text-red-500/40 tracking-widest uppercase'>Sever connections</span>
                        </div>
                    </div>
                    <Switch checked={isRoomLocked} onCheckedChange={toggleRoomLock} className="data-[state=checked]:bg-red-500 scale-75 origin-right" />
                </div>
            </motion.div>
          )}
        </div>

        <div className='p-3 md:p-5 bg-black/40 border-t border-white/5 flex gap-2 md:gap-3 relative z-10 shrink-0'>
          {isHost ? (
            <>
                <button
                    onClick={() => {
                        // Logic mapping from Mode to accessType/waitingRoom
                        let finalAccessType: 'public' | 'password' = 'public';
                        let finalHasWaitingRoom = false;
                        let finalPassword = undefined;

                        if (mode === 'private') {
                            finalAccessType = 'password';
                            finalPassword = newPassword.trim() || undefined; 
                        } else if (mode === 'barrier') {
                            finalAccessType = 'public';
                            finalHasWaitingRoom = true;
                        } else {
                            // Public
                            finalAccessType = 'public';
                            finalHasWaitingRoom = false;
                        }

                        updateRoomSettings(
                            undefined,
                            finalPassword,
                            finalHasWaitingRoom,
                            finalAccessType
                        );
                        setOpen(false);
                    }}
                    className='flex-1 h-9 md:h-11 btn-luxury rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(0,200,255,0.2)] transition-all'
                >
                    Apply
                </button>
                <button
                    onClick={() => setShowDisbandConfirm(true)}
                    className='w-9 h-9 md:w-11 md:h-11 bg-red-500/10 border border-red-500/20 rounded-lg md:rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all transform active:scale-95'
                >
                    <Trash2 className='w-3.5 h-3.5 md:w-4 md:h-4' />
                </button>
            </>
          ) : (
            <button
              onClick={handleLeave}
              className='w-full h-9 md:h-11 bg-red-500 text-white rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(239,68,68,0.2)] hover:bg-red-600 transition-all flex items-center justify-center gap-2'
            >
              <LogOut className='w-3.5 h-3.5' /> Disconnect
            </button>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showDisbandConfirm} onOpenChange={setShowDisbandConfirm}>
        <AlertDialogContent className="luxury-glass border-white/5 p-12 rounded-[3.5rem] bg-black/80 backdrop-blur-3xl">
          <AlertDialogHeader className="mb-8">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-8">
                <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <AlertDialogTitle className="text-4xl font-black uppercase italic tracking-tighter text-white">Full Termination?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 font-medium pt-4">
               Establishing mandatory disconnection for all active nodes. This action is irreversible. All matrix data will be purged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4">
            <AlertDialogCancel className="h-16 rounded-3xl border-white/10 bg-white/5 text-white/50 uppercase font-black text-[10px] tracking-widest hover:bg-white/10">Abort</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { disbandRoom(); navigate('/dashboard'); }}
              className='h-16 rounded-3xl bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.3)] uppercase font-black text-[10px] tracking-widest hover:bg-red-600 transition-all'
            >
              Nuclear Disband
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default SettingsModal;
