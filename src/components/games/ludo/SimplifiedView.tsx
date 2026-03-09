/**
 * Simplified View Component
 * Features: Cognitive load control during chain events
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface SimplifiedViewProps {
  children: ReactNode;
  isChainEvent: boolean;
  isMultiSix: boolean;
}

export const SimplifiedView = ({ children, isChainEvent, isMultiSix }: SimplifiedViewProps) => {
  return (
    <div className='relative'>
      {children}

      {/* Fade non-essential UI during chain events */}
      <AnimatePresence>
        {(isChainEvent || isMultiSix) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='absolute inset-0 bg-black pointer-events-none'
          />
        )}
      </AnimatePresence>
    </div>
  );
};
