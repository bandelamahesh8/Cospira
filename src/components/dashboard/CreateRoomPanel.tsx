import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Gamepad2, Briefcase, Shuffle, Lock, Globe, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface RoomConfig {
  name: string;
  mode: string;
  securityLevel: string;
  privacy: string;
  password?: string;
}

interface CreateRoomPanelProps {
  onClose: () => void;
  onCreate: (config: RoomConfig) => void;
  isCreating: boolean;
}

type RoomMode = 'fun' | 'professional' | 'ultra' | 'mixed';
type PrivacyType = 'public' | 'encrypted';

export const CreateRoomPanel = ({ onCreate, isCreating }: CreateRoomPanelProps) => {
  const [roomName, setRoomName] = useState('');
  const [mode, setMode] = useState<RoomMode>('fun');
  const [privacy, setPrivacy] = useState<PrivacyType>('public');
  const [password, setPassword] = useState('');

  const handleCreate = () => {
    if (!roomName.trim()) {
      toast.error('Sector Designation Required');
      return;
    }
    if ((privacy === 'encrypted' || mode === 'ultra') && !password.trim()) {
      if (mode === 'ultra') {
        toast.error('Security Protocol Incomplete', {
          description: 'Ultra Security requires a mandatory passkey.',
        });
      } else {
        toast.error('Security Protocol Incomplete', {
          description: 'Passkey required for encrypted sectors.',
        });
      }
      return;
    }
    onCreate({
      name: roomName,
      mode,
      securityLevel: privacy === 'encrypted' || mode === 'ultra' ? 'encrypted' : 'basic',
      privacy: privacy === 'public' ? 'public' : 'private',
      password: password.trim(),
    });
  };

  const MODE_DESCRIPTIONS = {
    fun: 'Entertainment & casual socializing. No restrictions, no AI summary.',
    professional: 'Distraction-free workspace with AI minutes. No games.',
    ultra: 'Maximum protection. No screenshots/recording. Mandatory PIN. High Professional.',
    mixed: 'Hybrid environment with all features enabled (Games + AI).',
  };

  return (
    <div className='space-y-6'>
      {/* Privacy Selection at the Top */}
      <div className='space-y-2'>
        <Label className='text-[10px] font-black uppercase tracking-widest text-white/30 px-2'>
          Privacy Access
        </Label>
        <div className='grid grid-cols-2 gap-3'>
          <button
            onClick={() => setPrivacy('public')}
            className={`h-16 px-4 rounded-2xl border transition-all flex items-center gap-3 ${privacy === 'public' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}`}
          >
            <div
              className={`p-2 rounded-xl ${privacy === 'public' ? 'bg-emerald-500/20 text-emerald-400 font-black' : 'bg-white/5 text-white/40'}`}
            >
              <Globe className='w-5 h-5 font-black' />
            </div>
            <div className='text-left'>
              <div
                className={`text-xs font-black uppercase tracking-tight ${privacy === 'public' ? 'text-white' : 'text-white/60'}`}
              >
                Public Sector
              </div>
              <div className='text-[10px] font-bold text-white/30 uppercase tracking-widest'>
                Open Uplink
              </div>
            </div>
          </button>

          <button
            onClick={() => setPrivacy('encrypted')}
            className={`h-16 px-4 rounded-2xl border transition-all flex items-center gap-3 ${privacy === 'encrypted' ? 'bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/5'}`}
          >
            <div
              className={`p-2 rounded-xl ${privacy === 'encrypted' ? 'bg-indigo-500/20 text-indigo-400 font-black' : 'bg-white/5 text-white/40'}`}
            >
              <Shield className='w-5 h-5 font-black' />
            </div>
            <div className='text-left'>
              <div
                className={`text-xs font-black uppercase tracking-tight ${privacy === 'encrypted' ? 'text-white' : 'text-white/60'}`}
              >
                Encrypted
              </div>
              <div className='text-[10px] font-bold text-white/30 uppercase tracking-widest'>
                Passkey Locked
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Sector Name and Password (Merged Row) */}
      <div className='space-y-2'>
        <Label className='text-[10px] font-black uppercase tracking-widest text-white/30 px-2'>
          Configuration
        </Label>
        <div className='flex gap-2'>
          <div
            className={`transition-all duration-500 ${privacy === 'encrypted' ? 'flex-[1.5]' : 'w-full'}`}
          >
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder='ENTER SECTOR NAME'
              className='h-14 bg-black/20 border-white/5 rounded-2xl font-black text-white placeholder:text-white/10 uppercase px-6 text-sm focus:bg-black/40 focus:border-indigo-500/50 transition-all tracking-tight'
            />
          </div>
          <AnimatePresence>
            {privacy === 'encrypted' && (
              <motion.div
                initial={{ width: 0, opacity: 0, x: 20 }}
                animate={{ width: 'auto', opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: 20 }}
                className='flex-1 overflow-hidden'
              >
                <Input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='SET PASSKEY'
                  className='h-14 bg-indigo-500/10 border-indigo-500/30 rounded-2xl font-black text-white placeholder:text-indigo-500/30 uppercase px-6 text-sm focus:border-indigo-500 transition-all tracking-tight'
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Room Mode Selection */}
      <div className='space-y-2'>
        <Label className='text-[10px] font-black uppercase tracking-widest text-white/30 px-2'>
          Sector Protocol
        </Label>
        <TooltipProvider delayDuration={0}>
          <div className='grid grid-cols-4 gap-2'>
            {[
              {
                id: 'fun',
                icon: Gamepad2,
                label: 'Fun',
                color: 'text-purple-400',
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/20',
              },
              {
                id: 'professional',
                icon: Briefcase,
                label: 'Pro',
                color: 'text-cyan-400',
                bg: 'bg-cyan-500/10',
                border: 'border-cyan-500/20',
              },
              {
                id: 'ultra',
                icon: Lock,
                label: 'Ultra',
                color: 'text-red-400',
                bg: 'bg-red-500/10',
                border: 'border-red-500/20',
              },
              {
                id: 'mixed',
                icon: Shuffle,
                label: 'Mixed',
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20',
              },
            ].map((m) => (
              <Tooltip key={m.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setMode(m.id as RoomMode);
                      if (m.id === 'ultra') setPrivacy('encrypted');
                    }}
                    className={`h-22 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      mode === m.id
                        ? `${m.bg} ${m.border} shadow-lg`
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <m.icon className={`w-6 h-6 ${mode === m.id ? m.color : 'text-white/20'}`} />
                    <span
                      className={`text-[10px] font-black uppercase tracking-[0.2em] ${mode === m.id ? 'text-white' : 'text-white/30'}`}
                    >
                      {m.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side='bottom'
                  className='bg-[#1A1F2B] text-white border-white/10 p-4 max-w-[240px] rounded-2xl shadow-2xl'
                >
                  <p className='text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1'>
                    {m.label} Mode
                  </p>
                  <p className='text-[10px] font-medium text-white/60 leading-relaxed uppercase tracking-tight'>
                    {MODE_DESCRIPTIONS[m.id as RoomMode]}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Action Button */}
      <div className='pt-2'>
        <button
          onClick={handleCreate}
          disabled={!roomName.trim() || isCreating}
          className={`w-full h-16 rounded-[22px] bg-white text-black font-black uppercase tracking-[0.4em] text-xs flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.01] active:scale-[0.99] transition-all ${
            !roomName.trim() || isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50'
          }`}
        >
          {isCreating ? (
            'Deploying...'
          ) : (
            <>
              {' '}
              Initiate Protocol <ArrowRight className='w-4 h-4' />{' '}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
