import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, LayoutGrid, Award, Frown, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GameResultOverlayProps {
  winnerId: string | 'draw' | null;
  players: Array<{ id: string; name: string }>;
  localUserId: string;
  isHost: boolean;
  onRematch: () => void;
  onEndGame: () => void;
  gameType: string;
}

export const GameResultOverlay: React.FC<GameResultOverlayProps> = ({
  winnerId,
  players,
  localUserId,
  isHost,
  onRematch,
  onEndGame,
  gameType,
}) => {
  if (!winnerId) return null;

  const isWinner = winnerId === localUserId;
  const isDraw = winnerId === 'draw';
  const winnerName = isDraw
    ? 'Everyone'
    : players.find((p) => p.id === winnerId)?.name || 'Unknown User';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='absolute inset-0 bg-slate-950/90 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 md:p-12 text-center'
    >
      <motion.div
        initial={{ scale: 0.8, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className='w-full max-w-lg bg-slate-900/50 border border-white/10 p-10 md:p-16 rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden'
      >
        {/* Decorative background effects */}
        <div
          className={cn(
            'absolute -top-24 -left-24 w-64 h-64 blur-[100px] rounded-full opacity-20',
            isWinner ? 'bg-emerald-500' : isDraw ? 'bg-blue-500' : 'bg-red-500'
          )}
        />
        <div
          className={cn(
            'absolute -bottom-24 -right-24 w-64 h-64 blur-[100px] rounded-full opacity-20',
            isWinner ? 'bg-yellow-500' : isDraw ? 'bg-purple-500' : 'bg-orange-500'
          )}
        />

        {/* Main Icon */}
        <div
          className={cn(
            'w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 rotate-12 shadow-2xl relative z-10',
            isWinner
              ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-yellow-500/20'
              : isDraw
                ? 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-blue-500/20'
                : 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-900/20'
          )}
        >
          {isWinner ? (
            <Trophy className='w-14 h-14 text-white -rotate-12' />
          ) : isDraw ? (
            <Split className='w-14 h-14 text-white -rotate-12' />
          ) : (
            <Frown className='w-14 h-14 text-white/50 -rotate-12' />
          )}
        </div>

        {/* Result Title */}
        <h2
          className={cn(
            'text-6xl font-black italic tracking-tighter uppercase mb-4',
            isWinner ? 'text-white' : isDraw ? 'text-blue-400' : 'text-slate-400'
          )}
        >
          {isWinner ? 'YOU WIN' : isDraw ? 'STALEMATE' : 'GAME OVER'}
        </h2>

        <p className='text-slate-500 font-bold uppercase tracking-[0.3em] mb-12 text-sm leading-relaxed'>
          {isWinner
            ? 'Master of the Arena'
            : isDraw
              ? 'Neither side yielded'
              : 'Better luck next time'}
          <br />
          <span className='text-white/40 mt-2 block lowercase italic'>
            {isDraw ? 'The match ended in a draw' : `${winnerName} claims victory`}
          </span>
        </p>

        {/* Actions */}
        <div className='flex flex-col gap-4 relative z-10 max-w-xs mx-auto'>
          {isHost && (
            <Button
              className='w-full h-16 bg-primary hover:bg-primary/90 text-background font-black text-xl rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest'
              onClick={onRematch}
            >
              <RotateCcw className='w-6 h-6 mr-3' /> Retry Match
            </Button>
          )}

          <Button
            variant='outline'
            className='w-full h-14 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all'
            onClick={onEndGame}
          >
            <LayoutGrid className='w-4 h-4 mr-3' /> Explore other games
          </Button>
        </div>

        {/* Standing / Quick Leaderboard */}
        <div className='mt-10 pt-8 border-t border-white/5 relative z-10'>
          <h3 className='text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-6'>
            Match Standings
          </h3>
          <div className='space-y-3'>
            {players.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-2xl border transition-all',
                  p.id === winnerId
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-white/5 border-white/5'
                )}
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black',
                      p.id === winnerId ? 'bg-primary text-background' : 'bg-white/10 text-white/40'
                    )}
                  >
                    {p.id === winnerId ? <Award className='w-4 h-4' /> : players.indexOf(p) + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold uppercase',
                      p.id === localUserId ? 'text-primary' : 'text-white'
                    )}
                  >
                    {p.name} {p.id === localUserId && '(You)'}
                  </span>
                </div>
                {p.id === winnerId && (
                  <span className='text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20'>
                    Champion
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className='mt-8'>
          <span className='text-[8px] font-black uppercase tracking-[0.5em] text-white/10 italic'>
            Terminal Session: {gameType.toUpperCase()}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};
