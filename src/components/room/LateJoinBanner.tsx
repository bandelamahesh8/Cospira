import React from 'react';
import { Sparkles, X, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface LateJoinBannerProps {
  summary: string;
  bullets: string[];
  duration: number;
  onDismiss: () => void;
  onExpand: () => void;
}

const LateJoinBanner: React.FC<LateJoinBannerProps> = ({
  summary,
  duration,
  onDismiss,
  onExpand,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className='fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4'
    >
      <div className='relative group rounded-2xl overflow-hidden'>
        {/* Glow/Gradient Background */}
        <div className='absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-3xl' />
        <div className='absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-2xl' />

        {/* Animated Border Gradient */}
        <div className='absolute inset-0 bg-gradient-to-r from-blue-500/10 via-white/5 to-indigo-500/10 opacity-50 pointer-events-none rounded-2xl' />

        <div className='relative p-4 flex items-center gap-5'>
          {/* Icon Section */}
          <div className='relative shrink-0'>
            <div className='w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center relative z-10'>
              <Sparkles className='w-6 h-6 text-blue-400 fill-blue-400/20' />
            </div>
            <div className='absolute inset-0 bg-blue-500/20 blur-xl z-0' />
          </div>

          {/* Content */}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
              <span className='text-[10px] font-black uppercase tracking-[0.2em] text-blue-400'>
                AI Context
              </span>
              <div className='flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5'>
                <Clock className='w-2.5 h-2.5 text-white/40' />
                <span className='text-[9px] font-mono font-bold text-white/60'>T-{duration}m</span>
              </div>
            </div>
            <p className='text-sm font-medium text-slate-300 truncate tracking-wide'>{summary}</p>
          </div>

          {/* Actions */}
          <div className='flex items-center gap-3 shrink-0'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onExpand}
              className='h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all'
            >
              Recap <ChevronRight className='w-3 h-3' />
            </motion.button>
            <motion.button
              onClick={onDismiss}
              whileHover={{ rotate: 90 }}
              className='w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/40 hover:text-white'
            >
              <X className='w-4 h-4' />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LateJoinBanner;
