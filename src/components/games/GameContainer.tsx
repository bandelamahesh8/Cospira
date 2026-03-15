import { Suspense } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import registry from '@/lib/plugins/ActivityRegistry';
import { Loader2 } from 'lucide-react';

export const GameContainer = () => {
  const { gameState, roomId } = useWebSocket();

  if (!gameState || !roomId || !gameState.type) return null;

  const activity = registry.getActivity(gameState.type);

  if (!activity) {
    return (
      <div className='flex flex-col items-center justify-center p-12 text-center'>
        <p className='text-white/60 font-bold uppercase tracking-widest text-xs mb-2'>
          Protocol Error
        </p>
        <p className='text-white font-black italic uppercase text-lg'>
          Unknown Sector: {gameState.type}
        </p>
      </div>
    );
  }

  const GameComponent = activity.component;

  return (
    <Suspense
      fallback={
        <div className='flex flex-col items-center justify-center p-12 animate-pulse'>
          <Loader2 className='w-12 h-12 text-primary animate-spin mb-4' />
          <p className='text-white/40 font-black uppercase tracking-[0.3em] text-[10px]'>
            Initializing Activity Stream...
          </p>
        </div>
      }
    >
      <GameComponent />
    </Suspense>
  );
};
