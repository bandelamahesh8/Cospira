/* eslint-disable @typescript-eslint/no-unused-vars */
import { motion, AnimatePresence } from 'framer-motion';
import { RoomMode } from '@/services/RoomIntelligence';
import { ChevronDown, Shield, Check } from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface MobileModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: RoomMode;
  onModeChange: (mode: RoomMode) => void;
  modes: Record<string, { label: string; icon: string; color: string; description: string }>;
}

export const MobileModeSelector = ({
  isOpen,
  onClose,
  currentMode,
  onModeChange,
  modes,
}: MobileModeSelectorProps) => {
  const { playClick, playHover } = useSoundEffects();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]'
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='fixed bottom-0 left-0 right-0 z-[101] bg-[#11161d] border-t border-white/10 rounded-t-[2rem] overflow-hidden'
          >
            {/* Drag Handle */}
            <div className='flex justify-center pt-3 pb-2' onClick={onClose}>
              <div className='w-12 h-1.5 bg-white/10 rounded-full' />
            </div>

            <div className='p-6 pt-2 pb-8'>
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-lg font-black text-white tracking-tight'>System Mode</h3>
                <button
                  onClick={onClose}
                  className='p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors'
                >
                  <ChevronDown className='w-5 h-5 text-white/60' />
                </button>
              </div>

              <div className='space-y-3'>
                {Object.entries(modes).map(([modeId, config]) => {
                  const isActive = currentMode === modeId;

                  return (
                    <button
                      key={modeId}
                      onClick={() => {
                        playClick();
                        onModeChange(modeId as RoomMode);
                        onClose();
                      }}
                      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all relative overflow-hidden group ${
                        isActive
                          ? 'bg-white/10 border border-white/20'
                          : 'bg-white/5 border border-white/5'
                      }`}
                      style={{
                        borderColor: isActive ? config.color : undefined,
                      }}
                    >
                      {/* Active Glow */}
                      {isActive && (
                        <div
                          className='absolute inset-0 opacity-10'
                          style={{ backgroundColor: config.color }}
                        />
                      )}

                      <div className='text-3xl relative z-10'>{config.icon}</div>

                      <div className='flex-1 text-left relative z-10'>
                        <div className='flex items-center gap-2'>
                          <span className='font-bold text-white text-base'>{config.label}</span>
                          {modeId === 'ultra' && (
                            <span className='px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-black uppercase rounded border border-red-500/20'>
                              Secure
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-white/40 mt-0.5 font-medium'>
                          {config.description}
                        </p>
                      </div>

                      {isActive && (
                        <div className='w-6 h-6 rounded-full bg-white text-black flex items-center justify-center relative z-10'>
                          <Check className='w-3.5 h-3.5' />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
