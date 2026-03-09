/**
 * Focused View Component
 * Cognitive load control - one event at a time
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { SNAKELADDER_CONFIG } from '@/lib/snakeladder/config';

interface FocusedViewProps {
  children: ReactNode;
  isMajorEvent: boolean; // Snake slide or ladder climb
  eventType?: 'snake' | 'ladder' | null;
}

export const FocusedView = ({ children, isMajorEvent, eventType }: FocusedViewProps) => {
  return (
    <div className='relative'>
      {children}

      {/* Dim everything during snake/ladder */}
      <AnimatePresence>
        {isMajorEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: SNAKELADDER_CONFIG.VISUAL.BOARD_FADE_ON_EVENT }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className='absolute inset-0 bg-black pointer-events-none'
          >
            {/* Optional fate message overlay */}
            {eventType && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xl font-light text-center'
              >
                {/* Fate message would go here */}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
