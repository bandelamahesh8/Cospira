import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, LayoutGrid, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ResultPayload } from '@/types/kart';
import { useWebSocket } from '@/hooks/useWebSocket';

interface KartResultsOverlayProps {
  results: ResultPayload[];
  onDismiss: () => void;
}

export function KartResultsOverlay({ results, onDismiss }: KartResultsOverlayProps) {
  const { users } = useWebSocket();

  // Sort results by rank (position)
  const sortedResults = [...results].sort((a, b) => a.position - b.position);
  const firstPlaceId = sortedResults.find((r) => r.position === 1)?.playerId;
  const firstPlaceName = users.find((u) => u.id === firstPlaceId)?.name || 'Someone';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='absolute inset-0 bg-slate-950/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 md:p-12 overflow-y-auto'
    >
      <motion.div
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className='w-full max-w-2xl bg-slate-900/50 border border-white/10 p-10 md:p-16 rounded-[4rem] shadow-[0_0_100px_rgba(244,63,94,0.3)] relative overflow-hidden my-auto'
      >
        {/* Decorative background effects */}
        <div className='absolute -top-24 -left-24 w-64 h-64 blur-[100px] rounded-full opacity-20 bg-rose-500' />
        <div className='absolute -bottom-24 -right-24 w-64 h-64 blur-[100px] rounded-full opacity-20 bg-orange-500' />

        {/* Podium Icon */}
        <div className='w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-rose-500 to-orange-600 shadow-2xl shadow-rose-500/20 flex items-center justify-center mx-auto mb-10 rotate-12 relative z-10'>
          <Trophy className='w-14 h-14 text-white -rotate-12' />
        </div>

        {/* Result Title */}
        <h2 className='text-6xl font-black italic tracking-tighter uppercase mb-2 text-white'>
          RACE <span className='text-rose-500'>COMPLETE</span>
        </h2>
        <p className='text-slate-500 font-bold uppercase tracking-[0.3em] mb-12 text-sm leading-relaxed'>
          {firstPlaceName} is the Circuit Master
          <br />
          <span className='text-white/40 mt-2 block lowercase italic'>
            Final standings confirmed for Sector Alpha
          </span>
        </p>

        {/* STANDINGS TABLE */}
        <div className='space-y-3 mb-12 relative z-10'>
          <AnimatePresence>
            {sortedResults.map((res, idx) => {
              const playerName = users.find((u) => u.id === res.playerId)?.name || 'Combatant';
              return (
                <motion.div
                  key={res.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-3xl border transition-all',
                    res.position === 1
                      ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <div className='flex items-center gap-4'>
                    <div
                      className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs',
                        res.position === 1
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      )}
                    >
                      {res.position === 1 ? <Award className='w-5 h-5' /> : `#${res.position}`}
                    </div>
                    <div>
                      <p className='text-sm font-bold text-white uppercase'>{playerName}</p>
                      <div className='flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase tracking-widest'>
                        <Clock className='w-3 h-3' />
                        {Math.floor(res.totalTimeMs / 1000)}s total
                      </div>
                    </div>
                  </div>

                  <div className='text-right'>
                    <div className='text-sm font-black text-rose-500'>
                      {res.bestLapMs > 0 ? `${(res.bestLapMs / 1000).toFixed(2)}s` : '--'}
                    </div>
                    <div className='text-[8px] text-slate-600 font-black uppercase tracking-tight'>
                      Best Lap
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className='flex flex-col gap-4 relative z-10 max-w-xs mx-auto'>
          <Button
            className='w-full h-16 bg-white hover:bg-slate-200 text-black font-black text-lg rounded-3xl shadow-xl active:scale-95 transition-all uppercase tracking-widest'
            onClick={onDismiss}
          >
            <LayoutGrid className='w-5 h-5 mr-3' /> Exit to Hub
          </Button>
        </div>

        <div className='mt-12'>
          <span className='text-[8px] font-black uppercase tracking-[0.5em] text-white/10 italic'>
            Session Terminated • Apex Circuit v1.0
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
