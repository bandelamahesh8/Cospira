/**
 * Failure Softening Component
 * Visual cushioning after snake fall
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SNAKELADDER_CONFIG } from '@/lib/snakeladder/config';

interface FailureSofteningProps {
  justFell: boolean;
  onComplete?: () => void;
}

export const FailureSoftening = ({ justFell, onComplete }: FailureSofteningProps) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (justFell) {
      setIsActive(true);
      
      // Auto-complete after softening period
      setTimeout(() => {
        setIsActive(false);
        onComplete?.();
      }, 2000);
    }
  }, [justFell, onComplete]);

  if (!isActive) return null;

  return (
    <>
      {/* Board zoom out slightly */}
      {SNAKELADDER_CONFIG.COMFORT.ZOOM_OUT_AFTER_FALL && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          initial={{ scale: 1 }}
          animate={{ scale: 0.95 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}

      {/* Colors soften */}
      {SNAKELADDER_CONFIG.COMFORT.COLOR_SOFTEN_AFTER_FALL && (
        <motion.div
          className="fixed inset-0 bg-white pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 1.5 }}
        />
      )}
    </>
  );
};
