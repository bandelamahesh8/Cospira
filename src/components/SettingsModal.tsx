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
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Clock,
  UserCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useOrganization } from '@/contexts/useOrganization';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { copyToClipboard } from '@/utils/clipboard';
import { AdvancedRoomSettings, type AdvancedSettings } from './rooms/AdvancedRoomSettings';

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
    organizationName,
    inviteToken,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    changeVideoDevice,
    changeAudioDevice,
    isNoiseSuppressionEnabled,
    toggleNoiseSuppression,
    isAutoFramingEnabled,
    toggleAutoFraming,
    autoApprove,
    stopJoiningTime: currentStopJoiningTime,
    settings: currentAdvancedSettings,
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
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      });
    }
  }, [open]);

  const [mode, setMode] = useState<'public' | 'private' | 'barrier'>('public');
  // Local state for password input when in private mode
  const [newPassword, setNewPassword] = useState('');

  // Advanced Join Settings
  const [autoApproveParticipants, setAutoApproveParticipants] = useState(false);
  const [stopJoiningTime, setStopJoiningTime] = useState<number>(0);

  // Advanced Room Settings State
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    invite_only: false,
    join_by_link: true,
    join_by_code: true,
    host_only_code_visibility: false,
    waiting_lobby: false,
    organization_only: false,
    host_controlled_speaking: false,
    chat_permission: 'everyone',
    encryption_enabled: true,
    ai_moderation_level: 'passive',
    auto_close_minutes: 0,
    smart_room_mode: 'free',
    neural_protocols_enabled: false,
    require_reapproval_on_rejoin: false,
  });

  const { currentOrganization } = useOrganization();
  const isOrgRoom =
    accessType === 'organization' ||
    !!organizationName ||
    !!currentOrganization ||
    window.location.pathname.includes('/org');

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
      setAutoApproveParticipants(autoApprove || false);
      setStopJoiningTime(currentStopJoiningTime || 0);

      if (currentAdvancedSettings) {
        setAdvancedSettings((prev: AdvancedSettings) => ({
          ...prev,
          ...(currentAdvancedSettings as unknown as AdvancedSettings),
        }));
      }
    }
  }, [
    open,
    currentRoomName,
    accessType,
    hasWaitingRoom,
    autoApprove,
    currentStopJoiningTime,
    currentAdvancedSettings,
  ]);

  const handleLeave = () => {
    leaveRoom();
    navigate('/dashboard');
  };

  const copyInviteToken = async () => {
    if (inviteToken) {
      const link = `${window.location.origin}/room/${roomId}?token=${inviteToken}`;
      const success = await copyToClipboard(link);
      if (success) {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
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
      <DialogContent className='w-[85vw] max-w-[380px] md:max-w-[800px] max-h-[75vh] md:max-h-[85vh] flex flex-col luxury-glass border-white/5 bg-black/80 backdrop-blur-3xl p-0 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-gradient [&>button]:hidden rounded-2xl md:rounded-3xl'>
        <div className='absolute inset-x-0 top-0 h-16 md:h-24 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none' />

        <DialogHeader className='p-3 md:p-5 pb-2 relative z-10 shrink-0'>
          <div className='flex items-center justify-between'>
            <div className='flex flex-col'>
              <span className='text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-0.5 flex items-center gap-1.5'>
                <Zap className='w-2.5 h-2.5 md:w-3 md:h-3' /> Core Config
              </span>
              <DialogTitle className='text-lg md:text-2xl font-black uppercase italic tracking-tighter text-white'>
                ARENA{' '}
                <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-500'>
                  SYSTEMS
                </span>
              </DialogTitle>
            </div>
            <button
              onClick={() => setOpen(false)}
              className='w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white'
            >
              <X className='w-4 h-4' />
            </button>
          </div>
        </DialogHeader>

        <div className='p-3 md:p-5 pt-0 overflow-y-auto flex-1 custom-scrollbar relative z-10'>
          <div
            className={`grid gap-4 md:gap-6 ${isHost ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
          >
            {/* LEFT COLUMN */}
            <div className='space-y-3 md:space-y-4'>
              {/* Media Settings (Always Visible) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className='space-y-3'
              >
                <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2'>
                  <div className='h-px w-3 md:w-4 bg-white/20' />
                  Devices
                </h4>

                <div className='space-y-3 p-4 bg-[#111111] rounded-2xl border border-white/5'>
                  {/* Camera Selector */}
                  <div className='space-y-1.5'>
                    <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1'>
                      Camera
                    </Label>
                    <Select
                      value={selectedVideoDeviceId || undefined}
                      onValueChange={changeVideoDevice}
                    >
                      <SelectTrigger className='w-full h-10 md:h-12 bg-black/40 border-white/10 rounded-full text-[10px] md:text-xs text-white px-4 focus:ring-1 focus:ring-blue-500 hover:border-white/20 transition-all [&>span]:text-left'>
                        <SelectValue placeholder='Default Camera' />
                      </SelectTrigger>
                      <SelectContent className='bg-[#111111] border-white/10 text-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]'>
                        {videoDevices.length === 0 && (
                          <SelectItem
                            value='default'
                            disabled
                            className='text-xs focus:bg-white/10 focus:text-white cursor-not-allowed hidden'
                          >
                            Default Camera
                          </SelectItem>
                        )}
                        {videoDevices.map((device) => (
                          <SelectItem
                            key={device.deviceId}
                            value={device.deviceId || `cam-${Math.random()}`}
                            className='text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2'
                          >
                            {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mic Selector */}
                  <div className='space-y-1.5'>
                    <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1'>
                      Microphone
                    </Label>
                    <Select
                      value={selectedAudioDeviceId || undefined}
                      onValueChange={changeAudioDevice}
                    >
                      <SelectTrigger className='w-full h-10 md:h-12 bg-black/40 border-white/10 rounded-full text-[10px] md:text-xs text-white px-4 focus:ring-1 focus:ring-blue-500 hover:border-white/20 transition-all [&>span]:text-left'>
                        <SelectValue placeholder='Default Microphone' />
                      </SelectTrigger>
                      <SelectContent className='bg-[#111111] border-white/10 text-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]'>
                        {audioDevices.length === 0 && (
                          <SelectItem
                            value='default'
                            disabled
                            className='text-xs focus:bg-white/10 focus:text-white cursor-not-allowed hidden'
                          >
                            Default Microphone
                          </SelectItem>
                        )}
                        {audioDevices.map((device) => (
                          <SelectItem
                            key={device.deviceId}
                            value={device.deviceId || `mic-${Math.random()}`}
                            className='text-xs focus:bg-white/10 focus:text-white cursor-pointer py-2'
                          >
                            {device.label || `Mic ${device.deviceId.slice(0, 5)}...`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>

              {/* Neural Link (AI Features) - Power User Overrides */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className='space-y-3'
              >
                <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-purple-400/40 flex items-center gap-2'>
                  <div className='h-px w-3 md:w-4 bg-purple-500/20' />
                  Neural Link
                </h4>
                <div className='p-4 bg-[#130d1a] rounded-2xl border border-purple-500/10 space-y-4 relative overflow-hidden'>
                  <div className='absolute top-1/2 left-0 w-full h-32 bg-purple-500/10 blur-[50px] pointer-events-none -translate-y-1/2 opacity-50' />

                  <div className='flex items-center justify-between relative z-10'>
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400'>
                        <Zap className='w-3.5 h-3.5' />
                      </div>
                      <div className='flex flex-col'>
                        <Label className='text-[10px] md:text-xs font-black text-purple-400 uppercase'>
                          Noise Cancellation
                        </Label>
                        <span className='text-[7px] md:text-[8px] font-bold text-purple-400/40 tracking-widest uppercase'>
                          Voice Isolation
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={isNoiseSuppressionEnabled}
                      onCheckedChange={toggleNoiseSuppression}
                      className='data-[state=checked]:bg-purple-500 scale-75 md:scale-90 origin-right'
                    />
                  </div>

                  <div className='flex items-center justify-between relative z-10'>
                    <div className='flex items-center gap-3'>
                      <div className='w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400'>
                        <Zap className='w-3.5 h-3.5' />
                      </div>
                      <div className='flex flex-col'>
                        <Label className='text-[10px] md:text-xs font-black text-purple-400 uppercase'>
                          Auto Framing
                        </Label>
                        <span className='text-[7px] md:text-[8px] font-bold text-purple-400/40 tracking-widest uppercase'>
                          Target Tracking
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={isAutoFramingEnabled}
                      onCheckedChange={toggleAutoFraming}
                      className='data-[state=checked]:bg-purple-500 scale-75 md:scale-90 origin-right'
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* RIGHT COLUMN */}
            {isHost && (
              <div className='space-y-3 md:space-y-4'>
                {/* Host Protocols */}
                {isHost && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='space-y-3'
                  >
                    <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2'>
                      <div className='h-px w-3 md:w-4 bg-white/20' />
                      Admin
                    </h4>

                    {!isOrgRoom && (
                      <div className='grid gap-4 p-4 rounded-2xl bg-[#111111] border border-white/5'>
                        <div className='space-y-1.5'>
                          <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-1.5'>
                            Ident Key <Lock className='w-2 h-2 md:w-2.5 md:h-2.5 opacity-50' />
                          </Label>
                          <Input
                            value={currentRoomName || ''}
                            readOnly
                            disabled
                            className='h-10 md:h-12 bg-white/5 border-white/5 rounded-full text-[10px] md:text-xs font-bold tracking-tight px-4 text-white/30 cursor-not-allowed selection:bg-transparent'
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40 ml-1'>
                            Access Mode
                          </Label>
                          <div className='grid grid-cols-3 gap-2'>
                            {[
                              { id: 'public', label: 'PUBLIC', icon: Globe },
                              { id: 'private', label: 'PRIVATE', icon: Lock },
                              { id: 'barrier', label: 'BARRIER', icon: ShieldAlert },
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setMode(t.id as 'public' | 'private' | 'barrier')}
                                className={`
                                            h-10 md:h-12 rounded-full border flex flex-col items-center justify-center gap-0.5 transition-all duration-300
                                            ${mode === t.id ? `border-teal-500 bg-teal-500/10 text-white shadow-[0_0_15px_rgba(20,184,166,0.15)]` : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'}
                                        `}
                              >
                                <t.icon
                                  className={`w-3 h-3 md:w-3.5 md:h-3.5 ${mode === t.id ? 'text-teal-400' : ''}`}
                                />
                                <span
                                  className={`text-[6px] md:text-[8px] font-black tracking-[0.15em]`}
                                >
                                  {t.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {mode === 'private' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className='space-y-1.5 pt-1'
                          >
                            <div className='space-y-1'>
                              <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-amber-500/60 ml-1'>
                                Password
                              </Label>
                              <Input
                                type='password'
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder='Set new password...'
                                className='h-10 md:h-12 bg-amber-500/5 border-amber-500/20 rounded-full text-[10px] md:text-xs font-bold tracking-tight px-4 focus:border-amber-500/50 transition-all'
                              />
                            </div>
                          </motion.div>
                        )}

                        {mode === 'barrier' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className='space-y-1.5 pt-1'
                          >
                            <div className='p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl'>
                              <p className='text-[9px] text-teal-400/80 font-medium text-center'>
                                Users must request to join. You will receive a popup to admit them.
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {inviteToken && (
                          <div className='space-y-1 pt-2 border-t border-white/5'>
                            <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-indigo-400/60 ml-1'>
                              Invite Link
                            </Label>
                            <div className='flex gap-2'>
                              <Input
                                readOnly
                                value={`${window.location.origin}/room/${roomId}?token=${inviteToken}`}
                                className='h-8 md:h-10 bg-indigo-500/5 border-indigo-500/20 rounded-lg text-[8px] md:text-[10px] font-medium px-2 md:px-3 text-white/40'
                              />
                              <button
                                onClick={copyInviteToken}
                                className='w-8 h-8 md:w-10 md:h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white hover:scale-105 transition-all shadow-lg active:scale-95 shrink-0'
                              >
                                {copiedToken ? (
                                  <Check className='w-3 h-3 md:w-3.5 md:h-3.5' />
                                ) : (
                                  <Copy className='w-3 h-3 md:w-3.5 md:h-3.5' />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Advanced Join Settings */}
                    <div className='grid gap-4 p-4 rounded-2xl bg-[#111111] border border-white/5'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500'>
                            <UserCheck className='w-3.5 h-3.5' />
                          </div>
                          <div>
                            <h4 className='text-white text-[10px] md:text-xs font-black uppercase tracking-widest leading-none mb-1'>
                              Auto-Approve
                            </h4>
                            <p className='text-white/40 text-[7px] md:text-[8px] uppercase tracking-wider font-bold'>
                              Bypass Lobby for new joins
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={autoApproveParticipants}
                          onCheckedChange={setAutoApproveParticipants}
                          className='data-[state=checked]:bg-teal-500 scale-75 md:scale-90 origin-right'
                        />
                      </div>

                      <div className='border-t border-white/5 pt-4 space-y-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500'>
                            <Clock className='w-3.5 h-3.5' />
                          </div>
                          <div>
                            <h4 className='text-white text-[10px] md:text-xs font-black uppercase tracking-widest leading-none mb-1'>
                              Stop Joining
                            </h4>
                            <p className='text-white/40 text-[7px] md:text-[8px] uppercase tracking-wider font-bold'>
                              Close room entry after X mins
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-4 pl-[44px]'>
                          <Slider
                            value={[stopJoiningTime]}
                            onValueChange={(val) => setStopJoiningTime(val[0])}
                            min={0}
                            max={60}
                            step={5}
                            className='py-2 flex-1 [&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-none [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[data-orientation=horizontal]_span.bg-primary]:bg-purple-500 [&_[data-orientation=horizontal]_span.bg-secondary]:bg-white/10'
                          />
                          <div className='text-[10px] text-orange-500 font-black uppercase min-w-[36px] text-right'>
                            {stopJoiningTime === 0 ? 'NEVER' : `${stopJoiningTime}M`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Master Killswitches */}
                {isHost && !isOrgRoom && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className='space-y-3'
                  >
                    <h4 className='text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-red-500/40 flex items-center gap-2'>
                      <div className='h-px w-3 md:w-4 bg-red-500/20' />
                      Security
                    </h4>
                    <div className='p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/10 to-transparent rounded-2xl border border-red-500/10 flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500'>
                          <Lock className='w-3.5 h-3.5' />
                        </div>
                        <div className='flex flex-col'>
                          <Label className='text-[10px] md:text-xs font-black text-red-500 italic uppercase'>
                            Lockdown
                          </Label>
                          <span className='text-[7px] md:text-[8px] font-bold text-red-500/40 tracking-widest uppercase'>
                            Sever connections
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={isRoomLocked}
                        onCheckedChange={toggleRoomLock}
                        className='data-[state=checked]:bg-red-500 scale-75 md:scale-90 origin-right'
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Protocols Section */}
          {isHost && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='mt-6 border-t border-white/5 pt-6'
            >
              <h4 className='text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-primary mb-4 flex items-center gap-2 px-1'>
                <Zap className='w-3 h-3 md:w-4 md:h-4' /> Advanced Protocols
              </h4>
              <AdvancedRoomSettings settings={advancedSettings} onChange={setAdvancedSettings} />
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

                  const finalSettings: Record<string, unknown> = {
                    roomName: undefined,
                    password: finalPassword,
                    hasWaitingRoom: finalHasWaitingRoom,
                    accessType: finalAccessType,
                    autoApprove: autoApproveParticipants,
                    stopJoiningTime: stopJoiningTime,
                    ...advancedSettings,
                    // Sync legacy fields with advanced counterparts if needed
                    invite_only: advancedSettings.invite_only,
                    mode: advancedSettings.smart_room_mode,
                  };

                  updateRoomSettings(finalSettings);
                  setOpen(false);
                }}
                className='flex-1 h-10 md:h-12 bg-white hover:bg-white/90 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-[0_5px_20px_rgba(255,255,255,0.1)] transition-all transform active:scale-[0.98]'
              >
                Apply
              </button>
              <button
                onClick={() => setShowDisbandConfirm(true)}
                className='w-10 h-10 md:w-12 md:h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all transform active:scale-95'
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
        <AlertDialogContent className='luxury-glass border-white/5 p-12 rounded-[3.5rem] bg-black/80 backdrop-blur-3xl'>
          <AlertDialogHeader className='mb-8'>
            <div className='w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center mb-8'>
              <ShieldAlert className='w-10 h-10 text-red-500' />
            </div>
            <AlertDialogTitle className='text-4xl font-black uppercase italic tracking-tighter text-white'>
              Full Termination?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-400 font-medium pt-4'>
              Establishing mandatory disconnection for all active nodes. This action is
              irreversible. All matrix data will be purged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-4'>
            <AlertDialogCancel className='h-16 rounded-3xl border-white/10 bg-white/5 text-white/50 uppercase font-black text-[10px] tracking-widest hover:bg-white/10'>
              Abort
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                disbandRoom();
                navigate('/dashboard');
              }}
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
