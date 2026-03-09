import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Zap, Bot } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getModeConfig, type RoomSuggestion } from '@/services/RoomIntelligence';
import { logger } from '@/utils/logger';

interface RoomModeSuggestionProps {
  roomId: string;
  isHost: boolean;
}

/**
 * Room Mode Suggestion Component
 * Shows AI-powered room mode suggestions to the host
 */
export const RoomModeSuggestion: React.FC<RoomModeSuggestionProps> = ({ roomId, isHost }) => {
  const { getRoomSuggestions, applyRoomMode, roomMode } = useWebSocket();
  const [suggestion, setSuggestion] = useState<RoomSuggestion | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    // Only show suggestions to host
    if (!isHost || !roomId) return;

    // Delay suggestion to avoid overwhelming on join
    const timer = setTimeout(async () => {
      try {
        const response = await getRoomSuggestions(roomId);

        if (response.success && response.shouldSuggest) {
          setSuggestion(response);
          setIsVisible(true);
          logger.info('[RoomModeSuggestion] Showing suggestion:', response.suggestedMode);
        }
      } catch (error) {
        logger.error('[RoomModeSuggestion] Error getting suggestions:', error);
      }
    }, 3000); // Wait 3 seconds after joining

    return () => clearTimeout(timer);
  }, [roomId, isHost, getRoomSuggestions]);

  // Hide if mode changes (user manually changed or accepted suggestion)
  useEffect(() => {
    if (roomMode && suggestion && roomMode === suggestion.suggestedMode) {
      setIsVisible(false);
    }
  }, [roomMode, suggestion]);

  const handleApply = async () => {
    if (!suggestion || !roomId) return;

    setIsApplying(true);
    try {
      const success = await applyRoomMode(suggestion.suggestedMode);
      if (success) {
        setIsVisible(false);
      }
    } catch (error) {
      logger.error('[RoomModeSuggestion] Error applying mode:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!suggestion || !isVisible) return null;

  const config = getModeConfig(suggestion.suggestedMode);
  const confidencePercent = Math.round(suggestion.confidence * 100);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className='fixed top-28 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full mx-4 perspective-1000'
        >
          <div className='relative group'>
            {/* Glow Effect */}
            <div className='absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-[2.2rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500' />

            <div className='relative bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden'>
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
              <div className='absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none' />
              <div className='absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[40px] pointer-events-none' />

              {/* Header */}
              <div className='relative flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15)]'>
                    <Bot className='w-4 h-4 text-indigo-400' />
                  </div>
                  <div>
                    <h3 className='text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300'>
                      Cospira Intelligence
                    </h3>
                    <div className='flex items-center gap-1.5 mt-0.5'>
                      <span className='relative flex h-1.5 w-1.5'>
                        <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                        <span className='relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500'></span>
                      </span>
                      <span className='text-[9px] font-bold text-white/40 tracking-wider'>
                        {confidencePercent}% CONFIDENCE
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDismiss}
                  className='w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/30 hover:text-white'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>

              {/* Suggestion */}
              <div className='relative mb-6 bg-white/5 rounded-2xl p-4 border border-white/5'>
                <div className='flex items-start gap-4'>
                  <div className='shrink-0 p-3 bg-black/40 rounded-xl border border-white/5 shadow-inner'>
                    <div className='text-2xl text-white/90'>{config.icon}</div>
                  </div>
                  <div className='flex-1 min-w-0 pt-0.5'>
                    <div className='flex items-center gap-2 mb-1.5'>
                      <span className='text-xs font-bold text-white/50 uppercase tracking-wide'>
                        Suggesting
                      </span>
                      <ArrowRight className='w-3 h-3 text-white/20' />
                      <span className='text-xs font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]'>
                        {config.label}
                      </span>
                    </div>
                    <p className='text-xs text-slate-300 font-medium leading-relaxed'>
                      "{suggestion.reason}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='flex gap-3'>
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className='flex-1 h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none relative overflow-hidden'
                >
                  <div className='absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity' />
                  {isApplying ? (
                    <>
                      <div className='w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <Zap className='w-3.5 h-3.5 fill-white' />
                      Initialize
                    </>
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className='px-5 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-bold uppercase text-[10px] tracking-widest transition-all border border-white/5 hover:border-white/10'
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoomModeSuggestion;
