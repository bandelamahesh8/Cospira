/**
 * Stats Panel Component
 * Displays player statistics from session history
 */

import { getSessionStats } from '@/lib/chess/sessionHistory';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export const StatsPanel = () => {
  const stats = getSessionStats();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className='bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-white/10 space-y-3'
    >
      <h3 className='text-sm font-bold text-white flex items-center gap-2'>
        <Trophy className='w-4 h-4 text-yellow-500' />
        Your Stats
      </h3>

      {stats.total === 0 ? (
        <p className='text-xs text-slate-400 text-center py-4'>No games played yet</p>
      ) : (
        <>
          <div className='grid grid-cols-3 gap-2'>
            <div className='text-center bg-emerald-500/10 rounded-lg p-2'>
              <p className='text-2xl font-black text-emerald-500'>{stats.wins}</p>
              <p className='text-xs text-slate-400'>Wins</p>
            </div>
            <div className='text-center bg-red-500/10 rounded-lg p-2'>
              <p className='text-2xl font-black text-red-500'>{stats.losses}</p>
              <p className='text-xs text-slate-400'>Losses</p>
            </div>
            <div className='text-center bg-slate-500/10 rounded-lg p-2'>
              <p className='text-2xl font-black text-slate-400'>{stats.draws}</p>
              <p className='text-xs text-slate-400'>Draws</p>
            </div>
          </div>

          <div className='pt-2 border-t border-white/10 space-y-1'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-slate-400'>Win Rate</span>
              <span className='text-sm font-bold text-blue-400'>{stats.winRate.toFixed(1)}%</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-slate-400'>Total Games</span>
              <span className='text-sm font-bold text-white'>{stats.total}</span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};
