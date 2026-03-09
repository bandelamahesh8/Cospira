import { useState, useEffect, useCallback } from 'react';
import { SettingsService, UserSettings } from '@/services/SettingsService';
import { useAuth } from '@/hooks/useAuth';
import { Dialog } from '@/components/ui/dialog'; // Using primitives for custom styling
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings, Volume2, Eye, EyeOff, Bell, Cpu, Activity, Laptop, Zap, X } from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { user } = useAuth();
  const { playClick, playHover } = useSoundEffects();
  const [settings, setSettings] = useState<UserSettings>({
    volume: 50,
    theme: 'dark',
    notifications: true,
    streamer_mode: false,
  });

  // Mock System Stats for visual flair
  const [cpuLoad, setCpuLoad] = useState(34);
  const [memory, setMemory] = useState(45);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    const s = await SettingsService.getSettings(user.id);
    if (s) setSettings(s);
  }, [user]);

  useEffect(() => {
    if (!open) return;

    // Simulate live stats
    const interval = setInterval(() => {
      setCpuLoad((prev) => Math.min(99, Math.max(10, prev + (Math.random() * 10 - 5))));
      setMemory((prev) => Math.min(99, Math.max(20, prev + (Math.random() * 8 - 4))));
    }, 1500);

    if (user) {
      loadSettings();
    }

    return () => clearInterval(interval);
  }, [user, open, loadSettings]);

  const handleUpdate = async (key: keyof UserSettings, value: unknown) => {
    if (!user) return;
    playClick();
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await SettingsService.updateSettings(user.id, { [key]: value });
      // Subtle success sound for direct feedback handled by playClick mostly,
      // but we could add playSuccess() on completion if we wanted robust feedback.
    } catch (e) {
      console.error('Failed to save setting', e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0' />
        <DialogPrimitive.Content className='fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-0 border border-white/10 bg-[#05070a]/90 p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-3xl overflow-hidden'>
          {/* Header */}
          <div className='flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/[0.02]'>
            <div className='flex items-center gap-4'>
              <div className='w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20'>
                <Settings className='w-5 h-5 text-indigo-400 animate-spin-slow' />
              </div>
              <div>
                <h2 className='text-xl font-black text-white uppercase tracking-tighter'>
                  System Configuration
                </h2>
                <p className='text-[10px] text-indigo-400 font-mono uppercase tracking-widest'>
                  Version 2.4.0 // Build 9942
                </p>
              </div>
            </div>
            <DialogPrimitive.Close
              className='w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white/50 hover:text-white'
              onClick={() => playClick()}
              onMouseEnter={() => playHover()}
            >
              <X className='w-4 h-4' />
            </DialogPrimitive.Close>
          </div>

          <div className='grid md:grid-cols-12 min-h-[500px] max-h-[80vh] md:max-h-[none] overflow-y-auto md:overflow-visible'>
            {/* LEFT: DIAGNOSTICS */}
            <div className='md:col-span-4 bg-[#0a0d12] border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col gap-6 relative overflow-hidden shrink-0'>
              {/* Decorative Grid Background */}
              <div
                className='absolute inset-0 opacity-[0.03]'
                style={{
                  backgroundImage:
                    'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              <div className='relative z-10 space-y-6'>
                <h3 className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4'>
                  Diagnostics
                </h3>

                {/* CPU Widget */}
                <div className='p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-indigo-500/30 transition-colors'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2'>
                      <Cpu className='w-4 h-4 text-indigo-400' />
                      <span className='text-xs font-bold text-white/70'>Neural Core</span>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-mono',
                        cpuLoad > 80 ? 'text-red-400' : 'text-indigo-400'
                      )}
                    >
                      {cpuLoad.toFixed(1)}%
                    </span>
                  </div>
                  <div className='h-1 w-full bg-white/10 rounded-full overflow-hidden'>
                    <motion.div
                      className='h-full bg-indigo-500'
                      animate={{ width: `${cpuLoad}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* RAM Widget */}
                <div className='p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-emerald-500/30 transition-colors'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2'>
                      <Activity className='w-4 h-4 text-emerald-400' />
                      <span className='text-xs font-bold text-white/70'>Memory Heap</span>
                    </div>
                    <span className='text-xs font-mono text-emerald-400'>{memory.toFixed(1)}%</span>
                  </div>
                  <div className='h-1 w-full bg-white/10 rounded-full overflow-hidden'>
                    <motion.div
                      className='h-full bg-emerald-500'
                      animate={{ width: `${memory}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Network Widget */}
                <div className='p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-cyan-500/30 transition-colors'>
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2'>
                      <Zap className='w-4 h-4 text-cyan-400' />
                      <span className='text-xs font-bold text-white/70'>Uplink</span>
                    </div>
                    <span className='text-xs font-mono text-cyan-400'>STABLE</span>
                  </div>
                  <div className='flex gap-0.5 mt-2'>
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className='h-3 w-1 bg-cyan-500/20 rounded-full'
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.05 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: SETTINGS */}
            <div className='md:col-span-8 p-8 space-y-8 bg-gradient-to-br from-white/[0.01] to-transparent'>
              {/* AUDIO SECTION */}
              <section className='space-y-4'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='p-2 rounded-lg bg-pink-500/10 border border-pink-500/20'>
                    <Volume2 className='w-4 h-4 text-pink-400' />
                  </div>
                  <h3 className='text-sm font-black uppercase tracking-widest text-white/90'>
                    Audio Matrix
                  </h3>
                </div>

                <div className='bg-white/5 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors'>
                  <div className='flex items-center justify-between mb-4'>
                    <Label className='text-xs font-bold uppercase tracking-wide text-white/60'>
                      Master Output Level
                    </Label>
                    <span className='px-2 py-1 rounded bg-black/40 border border-white/10 text-xs font-mono text-pink-400'>
                      {settings.volume}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.volume]}
                    max={100}
                    step={1}
                    onValueChange={(vals) => handleUpdate('volume', vals[0])}
                    onPointerDown={() => playClick()}
                    className='py-2'
                  />
                  <div className='flex justify-between mt-2 text-[10px] text-white/20 uppercase font-black'>
                    <span>Mute</span>
                    <span>Max Gain</span>
                  </div>
                </div>
              </section>

              <div className='h-px bg-white/5' />

              {/* UX SECTION */}
              <section className='space-y-4'>
                <div className='flex items-center gap-3 mb-6'>
                  <div className='p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20'>
                    <Laptop className='w-4 h-4 text-cyan-400' />
                  </div>
                  <h3 className='text-sm font-black uppercase tracking-widest text-white/90'>
                    Interface Protocol
                  </h3>
                </div>

                <div className='space-y-3'>
                  {/* Streamer Mode Toggle */}
                  <div
                    className='group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all cursor-pointer'
                    onMouseEnter={() => playHover()}
                    onClick={() => handleUpdate('streamer_mode', !settings.streamer_mode)}
                  >
                    <div className='flex items-center gap-3'>
                      <div
                        className={cn(
                          'p-2 rounded-full transition-colors',
                          settings.streamer_mode
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-white/5 text-white/30'
                        )}
                      >
                        {settings.streamer_mode ? (
                          <EyeOff className='w-4 h-4' />
                        ) : (
                          <Eye className='w-4 h-4' />
                        )}
                      </div>
                      <div className='space-y-0.5'>
                        <Label className='text-sm font-bold text-white cursor-pointer'>
                          Streamer Mode
                        </Label>
                        <p className='text-[10px] text-white/40 font-medium'>
                          Obfuscate sensitive PII and user identities.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.streamer_mode}
                      onCheckedChange={(checked) => handleUpdate('streamer_mode', checked)}
                      className='data-[state=checked]:bg-purple-500'
                    />
                  </div>

                  {/* Notifications Toggle */}
                  <div
                    className='group flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all cursor-pointer'
                    onMouseEnter={() => playHover()}
                    onClick={() => handleUpdate('notifications', !settings.notifications)}
                  >
                    <div className='flex items-center gap-3'>
                      <div
                        className={cn(
                          'p-2 rounded-full transition-colors',
                          settings.notifications
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/5 text-white/30'
                        )}
                      >
                        <Bell className='w-4 h-4' />
                      </div>
                      <div className='space-y-0.5'>
                        <Label className='text-sm font-bold text-white cursor-pointer'>
                          System Alerts
                        </Label>
                        <p className='text-[10px] text-white/40 font-medium'>
                          Receive heads-up display notifications.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications}
                      onCheckedChange={(checked) => handleUpdate('notifications', checked)}
                      className='data-[state=checked]:bg-amber-500'
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
};
