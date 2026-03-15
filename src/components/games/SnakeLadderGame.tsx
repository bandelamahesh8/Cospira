import React, { useEffect, useMemo, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RotateCcw, Zap, Users, PlayCircle } from 'lucide-react';
import { SnakeLadderBoard } from './snakeladder/SnakeLadderBoard';
import { ThreeDDice } from './ui/ThreeDDice';
import { GameResultOverlay } from './ui/GameResultOverlay';
import { SnakeLadderEngine, SLGameState } from '@/game-engine/engines/SnakeLadderEngine';
import confetti from 'canvas-confetti';

/**
 * PRODUCTION-GRADE SNAKE & LADDER GAME
 * Implementation follows Engineering Specification v2.0
 */

export const SnakeLadderGame = () => {
  const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
  const { user } = useAuth();

  // Engine Instance (Host Only)
  const engineRef = useRef<SnakeLadderEngine | null>(null);

  // Cast state to SL specific type
  const gameData = useMemo(() => {
    if (!gameState || gameState.type !== 'snakeladder') return null;
    return gameState as unknown as SLGameState;
  }, [gameState]);

  const isMyTurn = gameData?.currentTurn === user?.id;
  const isSpectator = useMemo(() => {
    return !gameData?.players.some((p) => p.id === user?.id);
  }, [gameData, user]);

  // PHASE 7: Host Authoritative Logic
  useEffect(() => {
    if (isHost && gameData && !engineRef.current) {
      engineRef.current = new SnakeLadderEngine();
      // In a real state sync, we'd deserialize the current state
      // engineRef.current.deserialize(JSON.stringify(gameData));
    }
  }, [isHost, gameData]);

  // Handle Roll
  const handleRoll = () => {
    if (!isMyTurn || gameData?.phase !== 'ROLL') return;

    // Host locally calculates, clients request via socket
    if (isHost) {
      processAction('ROLL');
    } else {
      socket?.emit('make-game-move', {
        roomId,
        move: { type: 'roll' },
      });
    }
  };

  // Handle Move
  const handleMove = () => {
    if (!isMyTurn || gameData?.phase !== 'MOVE') return;

    if (isHost) {
      processAction('MOVE');
    } else {
      socket?.emit('make-game-move', {
        roomId,
        move: { type: 'move' },
      });
    }
  };

  const processAction = (type: 'ROLL' | 'MOVE') => {
    if (!engineRef.current || !gameData) return;

    const moveValue = type === 'ROLL' ? Math.floor(Math.random() * 6) + 1 : 0;
    const nextState = engineRef.current.applyMove(
      {
        playerId: user!.id,
        type: type,
        data: type === 'ROLL' ? { value: moveValue } : {},
        timestamp: Date.now(),
      },
      gameData
    );

    // Broadcast updated state
    socket?.emit('game-ludo-state-update', {
      roomId,
      newState: nextState,
    });

    if (nextState.winner) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  if (!gameData) return null;

  return (
    <Card className='w-full max-w-6xl mx-auto bg-[#05080f] border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] p-6 lg:p-10 rounded-[3rem] border-2 relative overflow-hidden flex flex-col lg:flex-row gap-8'>
      {/* AMBIENT BACKGROUND */}
      <div className='absolute inset-0 pointer-events-none overflow-hidden'>
        <div className='absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 blur-[120px] rounded-full' />
        <div className='absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-red-500/10 blur-[120px] rounded-full' />
      </div>

      {/* LEFT: THE BOARD */}
      <div className='flex-1 relative'>
        <SnakeLadderBoard
          players={gameData.players}
          currentTurn={gameData.currentTurn}
          snakes={gameData.board.snakes}
          ladders={gameData.board.ladders}
        />
      </div>

      {/* RIGHT: INTERFACE */}
      <div className='w-full lg:w-80 flex flex-col gap-6 relative z-10'>
        <div className='space-y-1'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 mb-2'>
            <Zap className='w-3 h-3 text-red-500 fill-red-500' />
            <span className='text-[10px] font-black text-red-500 uppercase tracking-widest'>
              Apex Serpents
            </span>
          </div>
          <h1 className='text-3xl font-black text-white italic uppercase leading-none tracking-tighter'>
            Snakes <br />
            <span className='text-red-500'>Arena</span>
          </h1>
        </div>

        {/* GAME STATUS PANEL */}
        <div className='flex-1 space-y-4'>
          <div className='p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl space-y-6'>
            {/* Current Turn Info */}
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10 relative'>
                <Users className='w-6 h-6 text-white/50' />
                {isMyTurn && (
                  <div className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#05080f] animate-pulse' />
                )}
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-black text-white truncate'>
                  {gameData.players.find((p) => p.id === gameData.currentTurn)?.name ||
                    'Next Player'}
                </p>
                <p className='text-[10px] font-bold text-slate-500 uppercase tracking-wider'>
                  {isMyTurn ? 'YOUR TURN' : 'WAITING...'}
                </p>
              </div>
            </div>

            {/* Dice Area */}
            <div className='flex flex-col items-center gap-4'>
              <div className='relative p-4 bg-black/40 rounded-3xl border border-white/5 shadow-inner'>
                <ThreeDDice value={gameData.dice || 1} rolling={false} size={100} />
              </div>

              {isMyTurn && !isSpectator && (
                <Button
                  onClick={gameData.phase === 'ROLL' ? handleRoll : handleMove}
                  className='w-full h-14 rounded-2xl font-black text-lg uppercase tracking-widest bg-red-600 hover:bg-red-500 shadow-xl shadow-red-600/20 active:scale-95 transition-all'
                >
                  {gameData.phase === 'ROLL' ? 'ROLL DICE' : 'MOVE TOKEN'}
                </Button>
              )}

              {!isMyTurn && !isSpectator && (
                <div className='w-full h-14 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-widest border border-dashed border-white/10 rounded-2xl italic'>
                  Opponent is thinking...
                </div>
              )}

              {isSpectator && (
                <div className='w-full h-14 flex items-center justify-center text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/10 border border-blue-400/20 rounded-2xl'>
                  Spectating Mode
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div className='grid grid-cols-2 gap-3'>
            <Button
              variant='outline'
              className='h-12 bg-white/5 border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10'
            >
              <PlayCircle className='w-4 h-4 mr-2' /> Auto
            </Button>
            <Button
              variant='outline'
              onClick={() => endGame()}
              className='h-12 bg-white/5 border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/5'
            >
              <RotateCcw className='w-4 h-4 mr-2' /> Abort
            </Button>
          </div>
        </div>
      </div>

      {/* VICTORY OVERLAY */}
      <GameResultOverlay
        winnerId={gameData.winner}
        players={gameData.players}
        localUserId={user?.id || ''}
        isHost={isHost}
        onRematch={() => {
          socket?.emit('start-game', {
            roomId,
            type: 'snakeladder',
            players: gameData.players.map((p) => p.id),
          });
        }}
        onEndGame={() => endGame()}
        gameType='snakeladder'
      />
    </Card>
  );
};
