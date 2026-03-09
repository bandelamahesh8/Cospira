import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirstTimeFlags, hasSeenFirstTime, markFirstTimeSeen } from '@/utils/firstTimeHelpers';
import { MousePointer2, Keyboard, Sparkles } from 'lucide-react';

export const SoftOnboarding = () => {
  const [currentHint, setCurrentHint] = useState<{
    id: string;
    text: string;
    icon: React.ReactNode;
    type?: 'info' | 'pro';
  } | null>(null);

  useEffect(() => {
    // 1. Controls Hint: Show if not seen, after 2s
    if (!hasSeenFirstTime(FirstTimeFlags.CONTROLS_HINT)) {
      const timer = setTimeout(() => {
        setCurrentHint({
          id: FirstTimeFlags.CONTROLS_HINT,
          text: 'Hover bottom zone to reveal command deck',
          icon: <MousePointer2 className='w-5 h-5 text-indigo-400' />,
          type: 'info',
        });
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 2. Shortcut Hint: Show if Controls seen but Shortcuts not, after 10s
    if (
      hasSeenFirstTime(FirstTimeFlags.CONTROLS_HINT) &&
      !hasSeenFirstTime(FirstTimeFlags.SHORTCUT_HINT)
    ) {
      const timer = setTimeout(() => {
        setCurrentHint({
          id: FirstTimeFlags.SHORTCUT_HINT,
          text: "Master the grid: 'M' Mute • 'V' Video",
          icon: <Keyboard className='w-5 h-5 text-amber-400' />,
          type: 'pro',
        });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-dismiss after 5s
  useEffect(() => {
    if (currentHint) {
      const timer = setTimeout(() => {
        if (currentHint) {
          markFirstTimeSeen(currentHint.id);
          setCurrentHint(null);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentHint]);

  return (
    <AnimatePresence>
      {currentHint && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className='fixed bottom-32 left-1/2 -translate-x-1/2 z-[100]'
        >
          <div
            className={`
                relative px-6 py-4 rounded-[2rem] flex items-center gap-4 bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group
            `}
          >
            {/* Glow Background */}
            <div
              className={`absolute inset-0 opacity-20 bg-gradient-to-r ${currentHint.type === 'pro' ? 'from-amber-500/20 to-orange-500/20' : 'from-indigo-500/20 to-purple-500/20'}`}
            />

            <div
              className={`
                    w-10 h-10 rounded-full flex items-center justify-center border relative z-10
                    ${currentHint.type === 'pro' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-indigo-500/10 border-indigo-500/30'}
                `}
            >
              {currentHint.icon}
            </div>

            <div className='flex flex-col relative z-10'>
              <span
                className={`text-[9px] font-black uppercase tracking-[0.2em] ${currentHint.type === 'pro' ? 'text-amber-500' : 'text-indigo-400'} mb-0.5 flex items-center gap-1`}
              >
                {currentHint.type === 'pro' && <Sparkles className='w-3 h-3' />}
                {currentHint.type === 'pro' ? 'Pro Insight' : 'System Guide'}
              </span>
              <span className='text-sm font-bold text-white tracking-wide font-sans'>
                {currentHint.text}
              </span>
            </div>

            <div className='absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none' />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
