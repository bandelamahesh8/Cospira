/**
 * LudoGame.tsx
 * Full-screen Ludo integration with Modern Aesthetics
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { LudoBoard } from '@/modules/games/ludo/ui/LudoBoard';
import { LudoEngine } from '@/modules/games/ludo/LudoEngine';
import { GameAction } from '@/modules/games/ludo/RulesEngine';
import { Dice } from '@/modules/games/ludo/ui/Dice';
import { Button } from '@/components/ui/button';
import { Crown, Settings2, Trophy } from 'lucide-react';

export const LudoGame: React.FC = () => {
  const { gameState, socket, roomId, isHost, effectiveUserId } = useWebSocket();
  const [isRolling, setIsRolling] = React.useState(false);

  const localUserId = effectiveUserId || '';

  const engine = useMemo(() => {
    if (gameState && gameState.type === 'ludo') {
      return new LudoEngine(gameState);
    }
    return null;
  }, [gameState]);

  const handleAction = useCallback(
    (action: GameAction) => {
      if (!socket || !roomId) return;

      if (action.type === 'REQUEST_ROLL') {
        setIsRolling(true);
        new Audio(
          'https://assets.mixkit.co/sfx/preview/mixkit-dice-roll-slow-shake-and-landing-2720.mp3'
        )
          .play()
          .catch(() => {});
        setTimeout(() => {
          socket.emit('game-ludo-action', { roomId, action });
          setIsRolling(false);
        }, 800);
      } else {
        if (action.type === 'MOVE_TOKEN') {
          new Audio('https://assets.mixkit.co/sfx/preview/mixkit-pawn-piece-move-2098.mp3')
            .play()
            .catch(() => {});
        }
        socket.emit('game-ludo-action', { roomId, action });
      }
    },
    [socket, roomId]
  );

  useEffect(() => {
    if (!isHost || !socket || !roomId || !engine) return;

    const handleRemoteAction = ({ action }: { action: GameAction }) => {
      const newState = engine.handleAction(action);
      socket.emit('game-ludo-state-update', { roomId, newState });

      if (action.type === 'REQUEST_ROLL') {
        const stateAfter = engine.getState();
        if (
          stateAfter.diceRolled &&
          !engine.hasPossibleMoves(stateAfter.currentTurn!, stateAfter.diceValue!)
        ) {
          setTimeout(() => {
            const finalState = engine.passTurn();
            socket.emit('game-ludo-state-update', { roomId, newState: finalState });
          }, 1500);
        }
      }
    };

    socket.on('game-ludo-action-received', handleRemoteAction);
    return () => {
      socket.off('game-ludo-action-received', handleRemoteAction);
    };
  }, [isHost, socket, roomId, engine]);

  if (!gameState || gameState.type !== 'ludo') return null;

  const isMyTurn = gameState.currentTurn === localUserId;
  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentTurn);

  const themeColorMap: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    yellow: '#eab308',
    blue: '#3b82f6',
  };

  const themeColor = themeColorMap[currentPlayer?.color || 'blue'];

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-80px)] font-['Bangers'] tracking-wide bg-[#020617] overflow-hidden">
      {/* 1. Game Arena (Left/Center) */}
      <div className='flex-[2.5] relative flex items-center justify-center p-4 lg:p-12 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black overflow-hidden'>
        {/* Ambient Glows */}
        <div
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[120px] rounded-full opacity-20 pointer-events-none transition-colors duration-1000'
          style={{ backgroundColor: themeColor }}
        />

        <div className='relative w-full h-full flex items-center justify-center'>
          <div className='w-full max-w-[85vh] aspect-square transform-gpu transition-transform duration-700'>
            <LudoBoard gameState={gameState} localUserId={localUserId} onAction={handleAction} />
          </div>
        </div>

        {/* Floating Game Info for Desktop */}
        <div className='hidden xl:flex absolute top-12 left-12 flex-col gap-4'>
          <div className='flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl'>
            <div className='w-2 h-12 bg-indigo-500 rounded-full' />
            <div>
              <h2 className='text-white text-3xl italic uppercase leading-tight'>Arena: LUDO</h2>
              <p className='text-indigo-400 font-sans text-[10px] font-black uppercase tracking-[0.2em]'>
                Cospira Gaming Engine v2.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Command Center (Right Panel) */}
      <div className='flex-1 min-w-[380px] max-w-[450px] border-l border-white/5 bg-[#0a0f1e] flex flex-col z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]'>
        {/* Header Section */}
        <div className='p-8 pb-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-orange-500/20'>
              <Trophy className='w-5 h-5 text-orange-500' />
            </div>
            <h1 className='text-4xl italic text-white leading-none'>COMMAND CENTER</h1>
          </div>
          <Button variant='ghost' size='icon' className='text-white/20 hover:text-white'>
            <Settings2 className='w-5 h-5' />
          </Button>
        </div>

        <div className='flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar'>
          {/* Active Turn Module */}
          <div
            className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-700 overflow-hidden ${isMyTurn ? 'border-white/20 scale-[1.02] shadow-2xl' : 'border-white/5 opacity-80'}`}
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <div className='absolute top-0 right-0 p-6 opacity-10'>
              <Crown className='w-24 h-24' style={{ color: themeColor }} />
            </div>

            <p className='font-sans text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-white/40'>
              {isMyTurn ? '• SYSTEM: YOUR COMMAND •' : '• SYSTEM: WAITING... •'}
            </p>

            <div className='flex items-center gap-6'>
              <Dice
                value={gameState.diceValue || 1}
                isRolling={isRolling}
                themeColor={themeColor}
              />
              <div>
                <h3 className='text-4xl text-white truncate max-w-[150px] italic leading-none mb-2'>
                  {currentPlayer?.name}
                </h3>
                <div className='flex items-center gap-2'>
                  <div
                    className='w-2 h-2 rounded-full animate-pulse'
                    style={{ backgroundColor: themeColor }}
                  />
                  <span className='text-white/40 font-sans text-[10px] font-bold uppercase tracking-widest leading-none'>
                    Active Sync
                  </span>
                </div>
              </div>
            </div>

            {isMyTurn && !gameState.diceRolled && (
              <Button
                onClick={() => handleAction({ type: 'REQUEST_ROLL', playerId: localUserId })}
                className='w-full h-16 mt-8 rounded-2xl text-2xl shadow-xl transition-all active:scale-95 border-none'
                style={{ backgroundColor: themeColor }}
              >
                LAUNCH DICE
              </Button>
            )}

            {isMyTurn && gameState.diceRolled && (
              <div className='mt-8 p-4 rounded-xl bg-white/5 border border-white/10 text-center animate-bounce'>
                <p className='text-lg text-white italic'>SELECT YOUR UNIT</p>
              </div>
            )}
          </div>

          {/* Players Roster */}
          <div className='space-y-4 pt-4'>
            <p className='font-sans text-[10px] font-black uppercase tracking-[0.4em] text-white/20 px-4'>
              Active Roster
            </p>
            <div className='grid grid-cols-1 gap-3'>
              {gameState.players.map((p) => (
                <div
                  key={p.id}
                  className={`p-5 rounded-3xl border flex items-center justify-between transition-all ${p.id === gameState.currentTurn ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-40'}`}
                >
                  <div className='flex items-center gap-4'>
                    <div
                      className='w-10 h-10 rounded-xl flex items-center justify-center text-white/40 bg-black/20'
                      style={{ borderLeft: `4px solid ${themeColorMap[p.color!]}` }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className='text-2xl text-white italic leading-none'>{p.name}</span>
                  </div>
                  {p.id === gameState.currentTurn && (
                    <div className='w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1] animate-pulse' />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className='p-8 border-t border-white/5 bg-black/40'>
          <div className='flex justify-between items-center opacity-30 text-[10px] font-sans font-black tracking-[0.3em] text-white uppercase'>
            <span>Latency: 24ms</span>
            <span>Build 2.0-F_R</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LudoGame;
