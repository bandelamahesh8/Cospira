/**
 * XO Waiting State
 * Silence with intent - tense, not broken
 */

import { motion } from 'framer-motion';

export const XOWaitingState = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      {/* Empty grid with subtle breathing */}
      <motion.div
        className="grid grid-cols-3 gap-0"
        animate={{ opacity: [0.6, 0.8, 0.6] }}
        transition={{ 
          repeat: Infinity, 
          duration: 2.5,
          ease: 'easeInOut'
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="w-20 h-20 border-4 border-slate-700"
            style={{
              borderRight: i % 3 === 2 ? 'none' : undefined,
              borderBottom: i >= 6 ? 'none' : undefined,
            }}
          />
        ))}
      </motion.div>

      {/* No spinner - just text fade */}
      <motion.p
        className="text-slate-500 text-sm font-light"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ 
          repeat: Infinity, 
          duration: 3,
          ease: 'easeInOut'
        }}
      >
        Waiting for opponent...
      </motion.p>
    </div>
  );
};
