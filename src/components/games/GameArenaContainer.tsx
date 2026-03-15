import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { GameContainer } from './GameContainer';
import { motion } from 'framer-motion';
import { Gamepad2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium game arena: same visual language as video container,
 * shown below video area with turn indicator.
 */
export const GameArenaContainer = () => {
  const { gameState, effectiveUserId } = useWebSocket();
  const { user: authUser } = useAuth();

  if (!gameState?.isActive || !gameState.type) return null;

  const currentTurnId = gameState.turn ?? null;
  const players = gameState.players ?? [];
  const localId = authUser?.id || effectiveUserId || '';
  const isMyTurn = currentTurnId === localId;
  const turnPlayer = players.find((p) => p.id === currentTurnId);
  const turnName = turnPlayer?.name ?? '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className='shrink-0 w-full flex flex-col gap-0 rounded-2xl md:rounded-[1.5rem] overflow-hidden border border-white/10 bg-[#05070a] shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
    >
      {/* Turn bar - premium HUD */}
      <div className='flex items-center justify-between px-4 py-2.5 md:px-5 md:py-3 bg-black/40 border-b border-white/5 backdrop-blur-sm'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center'>
            <Gamepad2 className='w-4 h-4 md:w-5 md:h-5 text-primary' />
          </div>
          <div>
            <p className='text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-widest'>
              Arena · {gameState.type.replace('-', ' ')}
            </p>
            <p className='text-sm md:text-base font-bold text-white flex items-center gap-2'>
              {currentTurnId ? (
                <>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-wider',
                      isMyTurn
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/10 text-white/80'
                    )}
                  >
                    {isMyTurn ? (
                      <>
                        <span className='relative flex h-1.5 w-1.5'>
                          <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75' />
                          <span className='relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500' />
                        </span>
                        Your turn
                      </>
                    ) : (
                      <>
                        <User className='w-3 h-3' />
                        {turnName}&apos;s turn
                      </>
                    )}
                  </span>
                </>
              ) : (
                <span className='text-white/50'>Setting up…</span>
              )}
            </p>
          </div>
        </div>
        <div className='flex items-center gap-1.5'>
          {players.map((p) => (
            <div
              key={p.id}
              className={cn(
                'w-6 h-6 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold bg-black/40 border-white/10',
                p.id === currentTurnId && 'border-primary ring-2 ring-primary/30'
              )}
              title={p.name}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Game surface - same visual weight as video container */}
      <div className='w-full min-h-[300px] max-h-[75vh] md:max-h-[700px] bg-[#05070a] flex items-center justify-center overflow-auto custom-scrollbar'>
        <GameContainer />
      </div>
    </motion.div>
  );
};
