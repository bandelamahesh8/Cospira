/**
 * Focus Mode Component
 * Hides non-essential UI when time is critical to reduce cognitive load
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface FocusModeProps {
  enabled: boolean;
  children: ReactNode;
}

export const FocusMode = ({ enabled, children }: FocusModeProps) => {
  return (
    <AnimatePresence>
      {!enabled && (
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 0.95,
            transition: { duration: 0.2 }
          }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
