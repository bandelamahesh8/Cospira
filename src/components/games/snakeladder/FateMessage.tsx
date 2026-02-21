/**
 * Fate Message Component
 * Silent acknowledgment - validate without words
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface FateMessageProps {
  message: string | null;
  type: 'snake' | 'ladder' | null;
}

export const FateMessage = ({ message, type }: FateMessageProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (message) {
      setShow(true);
      
      // Auto-hide after 2 seconds
      setTimeout(() => setShow(false), 2000);
    }
  }, [message]);

  return (
    <AnimatePresence>
      {show && message && (
        <motion.div
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg backdrop-blur-sm"
          style={{
            backgroundColor: type === 'ladder' ? '#22c55e20' : '#ef444420',
            border: `1px solid ${type === 'ladder' ? '#22c55e40' : '#ef444440'}`,
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <p className="text-white text-lg font-light text-center">
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
