import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { generateUUID } from '@/utils/uuid';

interface TranscriptItem {
  id: string;
  text: string;
  userId: string;
  userName?: string;
  timestamp: Date;
  isFinal: boolean;
}

export const CaptionsOverlay = () => {
  const { lastTranscript, users, effectiveUserId } = useWebSocket();
  const [captions, setCaptions] = useState<TranscriptItem[]>([]);

  useEffect(() => {
    if (lastTranscript) {
      const newItem: TranscriptItem = {
        id: generateUUID(),
        text: lastTranscript.text,
        userId: lastTranscript.userId,
        userName:
          lastTranscript.userId === 'me' || lastTranscript.userId === effectiveUserId
            ? 'You'
            : users.find((u) => u.id === lastTranscript.userId)?.name || 'Unknown',
        timestamp: new Date(lastTranscript.timestamp),
        isFinal: lastTranscript.isFinal || true, // Default to true if missing
      };

      setCaptions((prev) => {
        // Keep last 3 items
        const next = [...prev, newItem];
        if (next.length > 3) return next.slice(next.length - 3);
        return next;
      });

      // Auto-clear after 5 seconds of silence
      const timer = setTimeout(() => {
        setCaptions((prev) => prev.filter((c) => c.id !== newItem.id));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastTranscript, users, effectiveUserId]);

  if (captions.length === 0) return null;

  return (
    <div className='absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-none z-[100] flex flex-col items-center gap-2'>
      <AnimatePresence>
        {captions.map((caption) => (
          <motion.div
            key={caption.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className='bg-black/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3'
          >
            <span className='text-[10px] font-black uppercase tracking-widest text-primary/80 shrink-0'>
              {caption.userName}
            </span>
            <p className='text-sm md:text-base font-medium text-white leading-tight'>
              {caption.text}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
