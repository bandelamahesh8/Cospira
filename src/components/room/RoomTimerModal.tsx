import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Timer,
  Check,
  AlertCircle,
  Coffee,
  Target,
  Presentation,
  ShieldAlert,
  Settings2,
} from 'lucide-react';
import { TimerType, TimerAction } from '@/types/websocket';

interface RoomTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetTimer?: (minutes: number, label: string, type?: TimerType, action?: TimerAction) => void;
}

const MODES: {
  id: TimerType;
  label: string;
  icon: React.ElementType;
  color: string;
  defaultAction: TimerAction;
  defaultLabel: string;
}[] = [
  {
    id: 'end_room',
    label: 'End Room',
    icon: ShieldAlert,
    color: 'text-red-500',
    defaultAction: 'close',
    defaultLabel: 'Final Countdown',
  },
  {
    id: 'break',
    label: 'Small Break',
    icon: Coffee,
    color: 'text-blue-400',
    defaultAction: 'resume',
    defaultLabel: 'Short Break',
  },
  {
    id: 'task',
    label: 'Focused Task',
    icon: Target,
    color: 'text-emerald-400',
    defaultAction: 'notify',
    defaultLabel: 'Deep Work',
  },
  {
    id: 'presentation',
    label: 'Presentation',
    icon: Presentation,
    color: 'text-purple-400',
    defaultAction: 'none',
    defaultLabel: 'Speech Limit',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: Settings2,
    color: 'text-amber-500',
    defaultAction: 'none',
    defaultLabel: 'Special Event',
  },
];

const ACTIONS: { id: TimerAction; label: string; desc: string }[] = [
  { id: 'none', label: 'None', desc: 'Just a visual reminder' },
  { id: 'notify', label: 'Sound Alert', desc: 'Notify all users with audio' },
  { id: 'resume', label: 'Auto-Resume', desc: 'Prompt to end break/tasks' },
  { id: 'close', label: 'Hard Disband', desc: 'Close room for everyone' },
];

export const RoomTimerModal: React.FC<RoomTimerModalProps> = ({ isOpen, onClose, onSetTimer }) => {
  const [minutes, setMinutes] = useState<number>(10);
  const [label, setLabel] = useState<string>('Closing Room');
  const [type, setType] = useState<TimerType>('end_room');
  const [action, setAction] = useState<TimerAction>('close');

  if (!isOpen) return null;

  const handleSelectMode = (mode: (typeof MODES)[0]) => {
    setType(mode.id);
    setAction(mode.defaultAction);
    setLabel(mode.defaultLabel);
  };

  const handleApply = () => {
    if (onSetTimer) {
      onSetTimer(minutes, label, type, action);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4'>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className='w-full max-w-xl bg-[#0c0f14] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden'
        >
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]'>
            <div className='flex items-center gap-4'>
              <div className='p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20'>
                <Timer className='h-5 w-5 text-amber-500' />
              </div>
              <div>
                <h3 className='text-lg font-black uppercase tracking-widest text-white'>
                  Advanced Mission Timing
                </h3>
                <p className='text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]'>
                  Configure precise temporal protocols
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className='p-2 text-white/20 hover:text-white hover:bg-white/10 rounded-xl transition-all'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='p-8 flex flex-col gap-8'>
            {/* Mode Selection */}
            <div className='flex flex-col gap-3'>
              <label className='text-[10px] uppercase font-black tracking-widest text-white/30'>
                Select Protocol Mode
              </label>
              <div className='grid grid-cols-5 gap-3'>
                {MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleSelectMode(mode)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                      type === mode.id
                        ? 'bg-white/10 border-white/20 shadow-xl'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5 opacity-40 hover:opacity-100'
                    }`}
                  >
                    <mode.icon className={`w-5 h-5 ${mode.color}`} />
                    <span className='text-[9px] font-black uppercase text-center tracking-tight leading-none'>
                      {mode.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-8'>
              {/* Duration */}
              <div className='flex flex-col gap-4'>
                <div className='flex flex-col gap-2'>
                  <label className='text-[10px] uppercase font-black tracking-widest text-white/30'>
                    Temporal Length (Mins)
                  </label>
                  <div className='flex items-center gap-2'>
                    <input
                      type='number'
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                      className='w-20 text-center text-xl font-black bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white focus:outline-none focus:border-amber-500/50'
                      min={1}
                    />
                    <div className='flex-1 grid grid-cols-2 gap-2'>
                      {[5, 15, 30, 60].map((v) => (
                        <button
                          key={v}
                          onClick={() => setMinutes(v)}
                          className='py-2 text-[10px] font-black bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all uppercase'
                        >
                          {v}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='flex flex-col gap-2'>
                  <label className='text-[10px] uppercase font-black tracking-widest text-white/30'>
                    Notification Label
                  </label>
                  <input
                    type='text'
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className='text-sm bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-amber-500/50'
                    placeholder='Describe this event...'
                  />
                </div>
              </div>

              {/* Expiry Action */}
              <div className='flex flex-col gap-3'>
                <label className='text-[10px] uppercase font-black tracking-widest text-white/30'>
                  Expiry Protocol (Auto-Action)
                </label>
                <div className='flex flex-col gap-2'>
                  {ACTIONS.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => setAction(act.id)}
                      className={`flex items-start gap-4 p-3 rounded-2xl border transition-all text-left group ${
                        action === act.id
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`mt-1 h-3 w-3 rounded-full border-2 transition-all ${action === act.id ? 'bg-amber-500 border-amber-500' : 'border-white/10'}`}
                      />
                      <div>
                        <p
                          className={`text-[10px] font-black uppercase ${action === act.id ? 'text-amber-500' : 'text-white/60'}`}
                        >
                          {act.label}
                        </p>
                        <p className='text-[9px] text-white/30 font-medium leading-tight'>
                          {act.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className='bg-amber-500/5 border border-amber-500/10 rounded-[1.5rem] p-4 flex gap-4 items-center'>
              <div className='p-2 bg-amber-500/10 rounded-lg'>
                <AlertCircle className='w-4 h-4 text-amber-500' />
              </div>
              <p className='text-[10px] text-amber-500/60 leading-relaxed font-bold uppercase tracking-wider'>
                This process will synchronise all users to this timeline. Temporal shifts cannot be
                reversed without host authorisation.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-end gap-4 p-6 border-t border-white/5 bg-black/20'>
            <button
              onClick={onClose}
              className='px-6 py-3 text-[10px] font-black text-white/30 hover:text-white transition-colors uppercase tracking-[0.2em]'
            >
              Abstain
            </button>
            <button
              onClick={handleApply}
              className='px-8 py-3 bg-amber-500 hover:bg-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center gap-3 transition-all active:scale-95 duration-300'
            >
              <Check className='w-4 h-4' /> Initiate Timeline
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
