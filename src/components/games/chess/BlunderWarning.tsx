/**
 * Blunder Warning Component
 * Warns players before making moves that lose material
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface BlunderWarningProps {
  show: boolean;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BlunderWarning = ({ 
  show, 
  description,
  onConfirm, 
  onCancel 
}: BlunderWarningProps) => {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500/95 backdrop-blur-sm rounded-2xl p-4 shadow-2xl z-50 max-w-sm"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">⚠️ Possible Blunder</p>
          <p className="text-xs text-amber-50 mb-3">{description}</p>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onCancel}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={onConfirm} 
              className="bg-white text-amber-600 hover:bg-amber-50 font-bold"
            >
              Move Anyway
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
