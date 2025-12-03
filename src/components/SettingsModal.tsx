import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  LogOut,
  ShieldAlert,
  Edit,
  Lock,
  Trash2,
  Mic,
  Video,
  Copy,
  Check,
  Globe,
  Link as LinkIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SettingsModalProps {
  roomId: string;
  isHost: boolean;
}

const SettingsModal = ({ roomId, isHost }: SettingsModalProps) => {
  const {
    leaveRoom,
    disbandRoom,
    updateRoomSettings,
    roomName: currentRoomName,
    toggleRoomLock,
    isRoomLocked,
    changeVideoDevice,
    changeAudioDevice,
    selectedVideoDeviceId,
    selectedAudioDeviceId,
    hasWaitingRoom,
    accessType,
    inviteToken,
  } = useWebSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (open) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      });
    }
  }, [open]);

  // Room settings state (for host)
  const [newRoomName, setNewRoomName] = useState(currentRoomName || '');
  const [newPassword, setNewPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);
  const [enableWaitingRoom, setEnableWaitingRoom] = useState(hasWaitingRoom || false);
  const [selectedAccessType, setSelectedAccessType] = useState<'public' | 'password' | 'invite' | 'organization'>(
    accessType || 'public'
  );

  // Sync state when modal opens, but don't overwrite while editing to avoid cursor jumps
  useEffect(() => {
    if (open) {
      setNewRoomName(currentRoomName || '');
      setSelectedAccessType(accessType || 'public');
      setEnableWaitingRoom(hasWaitingRoom || false);
    }
  }, [open, currentRoomName, accessType, hasWaitingRoom]);

  // Debounced save for text inputs
  useEffect(() => {
    if (!open || !isHost) return;

    const timer = setTimeout(() => {
      // Only save if changed from current
      if (newRoomName !== currentRoomName || (newPassword && newPassword.length > 0)) {
        updateRoomSettings(
          newRoomName.trim() || undefined,
          removePassword ? '' : (newPassword.trim() || undefined),
          enableWaitingRoom,
          selectedAccessType
        );
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [newRoomName, newPassword, removePassword, open, isHost, currentRoomName, updateRoomSettings, enableWaitingRoom, selectedAccessType]);

  // Immediate save for toggles (triggered by their handlers, or separate effect)
  // We'll use a separate effect for these that runs immediately
  useEffect(() => {
    if (!open || !isHost) return;
    // Skip initial mount check if values match props? No, just save.
    // Actually, if we just opened, we don't want to save immediately if values match.
    // But updateRoomSettings is cheap if no change?
    // Let's rely on user interaction to change state.

    // Check if values differ from props before saving to avoid initial save on open
    if (enableWaitingRoom !== hasWaitingRoom || selectedAccessType !== accessType || removePassword) {
      updateRoomSettings(
        newRoomName.trim() || undefined,
        removePassword ? '' : (newPassword.trim() || undefined),
        enableWaitingRoom,
        selectedAccessType
      );
    }
  }, [enableWaitingRoom, selectedAccessType, removePassword, open, isHost, hasWaitingRoom, accessType, updateRoomSettings, newRoomName, newPassword]);

  const handleLeave = () => {
    leaveRoom();
    navigate('/dashboard');
  };

  const handleDisband = () => {
    if (confirm('Are you sure you want to disband this room? All participants will be removed.')) {
      disbandRoom();
      navigate('/dashboard');
    }
  };

  const copyInviteToken = () => {
    if (inviteToken) {
      navigator.clipboard.writeText(
        `${window.location.origin}/room/${roomId}?token=${inviteToken}`
      );
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='text-zinc-400 hover:text-white hover:bg-zinc-800'
          aria-label="Room Settings"
        >
          <Settings className='h-5 w-5' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden gap-0'>
        <DialogHeader className='p-6 pb-4 bg-zinc-950 border-b border-zinc-800'>
          <DialogTitle className='text-xl font-semibold'>Room Settings</DialogTitle>
          <DialogDescription className='text-zinc-400'>
            Manage your preferences and room controls.
          </DialogDescription>
        </DialogHeader>

        <div className='p-6 space-y-6 overflow-y-auto max-h-[70vh]'>
          {/* Host-only Room Settings (Moved to Top) */}
          {isHost && (
            <div className='space-y-4'>
              <h4 className='text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2'>
                <Edit className='h-3 w-3' /> Room Settings
              </h4>

              <div className='space-y-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800'>
                <div className='space-y-2'>
                  <Label htmlFor='room-name' className='text-zinc-300'>
                    Room Name
                  </Label>
                  <Input
                    id='room-name'
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder='Enter new room name'
                    className='bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-primary/50'
                  />
                </div>

                <div className='space-y-3'>
                  <Label className='text-zinc-300'>Access Type</Label>
                  <div className='grid grid-cols-3 gap-2'>
                    {[
                      {
                        id: 'public',
                        label: 'Public',
                        icon: Globe,
                        color: 'text-blue-400',
                        bg: 'bg-blue-400/10',
                        border: 'border-blue-400/50'
                      },
                      {
                        id: 'password',
                        label: 'Private',
                        icon: Lock,
                        color: 'text-amber-400',
                        bg: 'bg-amber-400/10',
                        border: 'border-amber-400/50'
                      },
                      {
                        id: 'invite',
                        label: 'Invite',
                        icon: LinkIcon,
                        color: 'text-purple-400',
                        bg: 'bg-purple-400/10',
                        border: 'border-purple-400/50'
                      }
                    ].map((type) => (
                      <div
                        key={type.id}
                        onClick={() => setSelectedAccessType(type.id as 'public' | 'password' | 'invite' | 'organization')}
                        className={`
                          cursor-pointer rounded-lg border p-2 flex flex-col items-center gap-1 transition-all duration-200
                          ${selectedAccessType === type.id
                            ? `${type.border} ${type.bg}`
                            : 'border-zinc-800 hover:bg-zinc-800/50'
                          }
                        `}
                      >
                        <type.icon className={`w-4 h-4 ${selectedAccessType === type.id ? type.color : 'text-zinc-400'}`} />
                        <span className={`text-xs font-medium ${selectedAccessType === type.id ? 'text-zinc-200' : 'text-zinc-400'}`}>
                          {type.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedAccessType === 'password' && (
                  <div className='space-y-2'>
                    <Label htmlFor='room-password' className='text-zinc-300'>
                      Change Password
                    </Label>
                    <Input
                      id='room-password'
                      type='password'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder='New password (leave empty to keep)'
                      disabled={removePassword}
                      className='bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-primary/50'
                    />
                    <div className='flex items-center space-x-2 pt-1'>
                      <Switch
                        id='remove-password'
                        checked={removePassword}
                        onCheckedChange={setRemovePassword}
                      />
                      <Label
                        htmlFor='remove-password'
                        className='text-sm text-zinc-400 cursor-pointer'
                      >
                        Remove password protection
                      </Label>
                    </div>
                  </div>
                )}

                {selectedAccessType === 'invite' && inviteToken && (
                  <div className='space-y-2'>
                    <Label className='text-zinc-300'>Invite Link</Label>
                    <div className='flex items-center gap-2'>
                      <Input
                        readOnly
                        value={`${window.location.origin}/room/${roomId}?token=${inviteToken}`}
                        className='bg-zinc-900 border-zinc-700 text-zinc-400'
                      />
                      <Button size='icon' variant='outline' onClick={copyInviteToken}>
                        {copiedToken ? (
                          <Check className='h-4 w-4 text-green-500' />
                        ) : (
                          <Copy className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    <p className='text-xs text-zinc-500'>
                      Only users with this specific link can join.
                    </p>
                  </div>
                )}

                <div className='flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800'>
                  <div className='flex flex-col space-y-1'>
                    <Label htmlFor='waiting-room' className='text-zinc-200 font-medium'>
                      Waiting Room
                    </Label>
                    <span className='text-xs text-zinc-500'>
                      Participants must be admitted by host
                    </span>
                  </div>
                  <Switch
                    id='waiting-room'
                    checked={enableWaitingRoom}
                    onCheckedChange={setEnableWaitingRoom}
                    className='data-[state=checked]:bg-primary'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Device Settings */}
          <div className='space-y-4'>
            <h4 className='text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2'>
              <Settings className='h-3 w-3' /> Device Settings
            </h4>
            <div className='space-y-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800'>
              <div className='space-y-2'>
                <Label className='text-zinc-300 flex items-center gap-2'>
                  <Video className='h-4 w-4' /> Camera
                </Label>
                <Select
                  value={selectedVideoDeviceId || undefined}
                  onValueChange={changeVideoDevice}
                >
                  <SelectTrigger className='bg-zinc-900 border-zinc-700 text-zinc-100'>
                    <SelectValue placeholder='Select Camera' />
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices
                      .filter((device) => device.deviceId && device.deviceId.trim() !== '')
                      .map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label className='text-zinc-300 flex items-center gap-2'>
                  <Mic className='h-4 w-4' /> Microphone
                </Label>
                <Select
                  value={selectedAudioDeviceId || undefined}
                  onValueChange={changeAudioDevice}
                >
                  <SelectTrigger className='bg-zinc-900 border-zinc-700 text-zinc-100'>
                    <SelectValue placeholder='Select Microphone' />
                  </SelectTrigger>
                  <SelectContent>
                    {audioDevices
                      .filter((device) => device.deviceId && device.deviceId.trim() !== '')
                      .map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Host Controls */}
          {isHost && (
            <div className='space-y-4'>
              <h4 className='text-sm font-medium text-red-400 uppercase tracking-wider flex items-center gap-2'>
                <ShieldAlert className='h-3 w-3' /> Host Controls
              </h4>

              <div className='p-4 rounded-xl bg-red-950/10 border border-red-900/20 space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    <div className='p-2 rounded-full bg-red-900/20 text-red-400'>
                      <Lock className='h-4 w-4' />
                    </div>
                    <div className='flex flex-col'>
                      <Label htmlFor='lock-room' className='font-medium text-red-100'>
                        Lock Room
                      </Label>
                      <span className='text-xs text-red-400/70'>
                        Prevent new participants from joining
                      </span>
                    </div>
                  </div>
                  <Switch
                    id='lock-room'
                    checked={isRoomLocked}
                    onCheckedChange={toggleRoomLock}
                    className='data-[state=checked]:bg-red-600'
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className='p-4 bg-zinc-950 border-t border-zinc-800'>
          {isHost ? (
            <Button
              variant='destructive'
              className='w-full bg-red-600 hover:bg-red-700 text-white font-medium h-11'
              onClick={() => setShowDisbandConfirm(true)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Disband Room
            </Button>
          ) : (
            <Button
              variant='destructive'
              className='w-full bg-red-600 hover:bg-red-700 text-white font-medium h-11'
              onClick={handleLeave}
            >
              <LogOut className='mr-2 h-4 w-4' />
              Leave Room
            </Button>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showDisbandConfirm} onOpenChange={setShowDisbandConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disband Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disband this room? All participants will be removed. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                disbandRoom();
                navigate('/dashboard');
              }}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              Disband Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default SettingsModal;
