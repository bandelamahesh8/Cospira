import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, WifiOff } from 'lucide-react';
import { CHESS_CONFIG } from '@/lib/chess/config';

interface SyncIndicatorProps {
  synced: boolean;
  connected?: boolean;
  show?: boolean;
}

export const SyncIndicator = ({ synced, connected = true, show = true }: SyncIndicatorProps) => {
  const [visible, setVisible] = useState(show);

  // Auto-hide after duration when synced
  useEffect(() => {
    if (synced && show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, CHESS_CONFIG.VISUAL.SYNC_INDICATOR_DURATION);

      return () => clearTimeout(timer);
    } else if (!synced) {
      setVisible(show);
    }
  }, [synced, show]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        className='absolute top-2 right-2 z-50'
      >
        {!connected ? (
          <div className='flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30'>
            <WifiOff className='w-3.5 h-3.5 text-red-400' />
            <span className='text-xs font-medium text-red-400'>Disconnected</span>
          </div>
        ) : synced ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.3 }}
            className='flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30'
          >
            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400' />
            <span className='text-xs font-medium text-emerald-400'>Synced</span>
          </motion.div>
        ) : (
          <div className='flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30'>
            <Loader2 className='w-3.5 h-3.5 text-amber-400 animate-spin' />
            <span className='text-xs font-medium text-amber-400'>Syncing...</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
