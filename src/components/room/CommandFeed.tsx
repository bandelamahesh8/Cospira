import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  X,
  AlertCircle,
  Info,
  LogIn,
  LogOut,
  Settings2,
  Zap,
  ShieldCheck,
  Terminal,
  List,
} from 'lucide-react';
import { useCommandFeed, FeedEvent } from '@/contexts/useCommandFeed';

interface CommandFeedProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandFeed: React.FC<CommandFeedProps> = ({ isOpen, onClose }) => {
  const { events, clearFeed } = useCommandFeed();

  if (!isOpen) return null;

  const renderIcon = (event: FeedEvent) => {
    if (event.type === 'ALERT') {
      return (
        <AlertCircle
          className={`h-4 w-4 ${event.level === 'warning' ? 'text-amber-400' : event.level === 'error' ? 'text-red-400' : 'text-blue-400'}`}
        />
      );
    }
    if (event.type === 'AUTOMATION') {
      return <Zap className='h-4 w-4 text-cyan-400' />;
    }
    if (event.type === 'NEURAL_GUARDIAN') {
      return <ShieldCheck className='h-4 w-4 text-purple-400' />;
    }
    switch (event.type) {
      case 'JOIN':
        return <LogIn className='h-4 w-4 text-emerald-400' />;
      case 'LEAVE':
        return <LogOut className='h-4 w-4 text-white/40' />;
      case 'STATE_CHANGE':
        return <Settings2 className='h-4 w-4 text-indigo-400' />;
      default:
        return <Info className='h-4 w-4 text-white/40' />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        className='fixed inset-y-0 right-0 w-[400px] z-[2000] flex flex-col pointer-events-none' // pointer-events-none to let clicks pass to backdrop (not built-in here, handled by caller!)
      >
        <div className='absolute inset-y-2 right-2 left-0 bg-[#06080d]/95 backdrop-blur-2xl border border-white/5 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden flex flex-col pointer-events-auto'>
          {/* Header */}
          <div className='shrink-0 p-5 border-b border-white/[0.04] flex flex-col gap-3 relative overflow-hidden bg-white/[0.02]'>
            {/* Ambient Top Glow */}
            <div className='absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none' />

            <div className='flex items-center justify-between relative z-10'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20'>
                  <Terminal className='h-4 w-4 text-cyan-400' />
                </div>
                <div>
                  <h3 className='text-sm font-black uppercase tracking-widest text-white'>
                    Command Log
                  </h3>
                  <p className='text-[9px] text-white/30 font-bold uppercase tracking-[0.2em]'>
                    Neural Dispatch Feed
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className='p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/10'
              >
                <X className='h-4 w-4' />
              </button>
            </div>

            <div className='flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/30 relative z-10 pt-2 border-t border-white/5'>
              <div className='flex items-center gap-4'>
                <div className='flex items-center gap-1.5'>
                  <Activity className='w-3 h-3 text-cyan-500 animate-pulse' />
                  <span>{events.length} Events</span>
                </div>
              </div>
              {events.length > 0 && (
                <button
                  onClick={clearFeed}
                  className='hover:text-red-400 focus:outline-none transition-colors'
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Feed Content */}
          <div className='flex-1 overflow-y-auto no-scrollbar p-5 bg-gradient-to-b from-transparent to-black/20'>
            <AnimatePresence initial={false}>
              {events.map((event) => {
                const borderClass =
                  event.level === 'warning'
                    ? 'border-amber-500/30'
                    : event.level === 'error'
                      ? 'border-red-500/30'
                      : event.level === 'success'
                        ? 'border-emerald-500/30'
                        : event.type === 'AUTOMATION'
                          ? 'border-cyan-500/30'
                          : event.type === 'NEURAL_GUARDIAN'
                            ? 'border-purple-500/30'
                            : 'border-white/5';

                const bgClass =
                  event.level === 'warning'
                    ? 'bg-amber-500/5'
                    : event.level === 'error'
                      ? 'bg-red-500/5'
                      : event.level === 'success'
                        ? 'bg-emerald-500/5'
                        : event.type === 'AUTOMATION'
                          ? 'bg-cyan-500/5'
                          : event.type === 'NEURAL_GUARDIAN'
                            ? 'bg-purple-500/5'
                            : 'bg-white/[0.02]';

                const titleColor =
                  event.level === 'warning'
                    ? 'text-amber-400'
                    : event.level === 'error'
                      ? 'text-red-400'
                      : event.level === 'success'
                        ? 'text-emerald-400'
                        : event.type === 'AUTOMATION'
                          ? 'text-cyan-400'
                          : event.type === 'NEURAL_GUARDIAN'
                            ? 'text-purple-400'
                            : 'text-white/80';

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`mb-3 p-4 rounded-2xl border backdrop-blur-sm shadow-xl flex gap-3 group transition-all hover:bg-white/[0.04] ${bgClass} ${borderClass}`}
                  >
                    <div className='mt-0.5 p-1.5 rounded-lg bg-black/40 shadow-inner'>
                      {renderIcon(event)}
                    </div>
                    <div className='flex-1 min-w-0 flex flex-col gap-1.5'>
                      <div className='flex items-start justify-between gap-3'>
                        <h4
                          className={`text-[11px] font-black uppercase tracking-widest leading-snug ${titleColor}`}
                        >
                          {event.title}
                        </h4>
                        <span
                          className='text-[9px] font-mono text-white/20 whitespace-nowrap mt-0.5'
                          title={new Date(event.timestamp).toLocaleString()}
                        >
                          {new Date(event.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className='text-[10px] font-medium leading-relaxed text-white/50 group-hover:text-white/70 transition-colors'>
                        {event.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              {events.length === 0 && (
                <div className='h-full flex flex-col items-center justify-center text-center px-6 opacity-40'>
                  <div className='p-4 rounded-full bg-white/5 border border-white/10 mb-4'>
                    <List className='h-8 w-8 text-white/40' />
                  </div>
                  <h3 className='text-xs font-black uppercase tracking-[0.2em] text-white'>
                    Log is Empty
                  </h3>
                  <p className='text-[9px] text-white/60 font-medium mt-2'>
                    Neural command feed will display organizational events and AI activity here.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
