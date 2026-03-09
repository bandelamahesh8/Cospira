import { useEffect, useState, useMemo, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { type GameState } from '@/types/websocket';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { RotateCcw, Users, Crown, Circle } from 'lucide-react';
import { GameResultOverlay } from './ui/GameResultOverlay';

interface PieceProps {
  type: 'man' | 'king';
  color: 'red' | 'white';
  isSelected?: boolean;
  onClick?: () => void;
}

const Piece = ({ type, color, isSelected, onClick }: PieceProps) => (
  <motion.div
    layoutId={`piece-${color}-${type}`}
    onClick={onClick}
    className={cn(
      'w-[80%] h-[80%] rounded-full shadow-lg cursor-pointer relative flex items-center justify-center transition-all',
      color === 'red' ? 'bg-red-600 border-red-800' : 'bg-slate-200 border-slate-300',
      isSelected ? 'ring-4 ring-yellow-400 scale-110 z-20' : 'hover:scale-105'
    )}
    style={{ borderWidth: '4px' }}
  >
    {/* Inner ring */}
    <div
      className={cn(
        'w-[70%] h-[70%] rounded-full border-2 opacity-30',
        color === 'red' ? 'border-red-900' : 'border-slate-400'
      )}
    />

    {/* King Crown */}
    {type === 'king' && (
      <Crown
        className={cn(
          'w-3/5 h-3/5 absolute drop-shadow-md',
          color === 'red' ? 'text-red-950' : 'text-slate-800'
        )}
        strokeWidth={2.5}
      />
    )}
  </motion.div>
);

export const CheckersGame = () => {
  const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
  const { user } = useAuth();

  // Typing for game state
  const gameData = useMemo(
    () =>
      gameState && (gameState as GameState).type === 'checkers'
        ? (gameState as unknown as GameState)
        : null,
    [gameState]
  );
  const players = useMemo(() => gameData?.players || [], [gameData?.players]);
  const board = useMemo(
    () => (gameData?.board as ({ type: 'man' | 'king'; color: 'red' | 'white' } | null)[][]) || [],
    [gameData?.board]
  );
  const turn = gameData?.turn;
  const winner = gameData?.winner;
  const isMyTurn = turn === user?.id;
  const myRole = useMemo(() => players?.find((p) => p.id === user?.id)?.role, [players, user]);

  // Assume Red is Player 2 (Top/Index 0) and White is Player 1 (Bottom/Index 7).
  // If I am Red, I want to see my pieces at the bottom, so I flip.
  // If I am White, I see standard view.
  const isFlipped = myRole === 'red';

  // Movement State
  const [selectedPos, setSelectedPos] = useState<{ r: number; c: number } | null>(null);

  // Sounds
  const playSound = useCallback((type: 'move' | 'capture' | 'king' | 'win') => {
    const sounds = {
      move: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
      capture: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3', // Heavier sound
      king: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Magical/Upgrade
      win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    };
    new Audio(sounds[type]).play().catch(() => {});
  }, []);

  // Selection Logic
  const handleSquareClick = (r: number, c: number) => {
    if (!isMyTurn || !!winner) return;

    const piece = board[r][c];
    // myRole is already defined in scope

    // If clicking own piece, select it
    if (piece && piece.color === myRole) {
      setSelectedPos({ r, c });
      return;
    }

    // If clicking empty square and have selection, try to move
    if (!piece && selectedPos) {
      socket?.emit('game-move', {
        roomId,
        move: {
          type: 'move',
          data: { from: selectedPos, to: { r, c } },
        },
      });
      setSelectedPos(null);
    }
  };

  // Listen for events to play sounds (requires engine to send lastMove type in metadata)
  /* 
       We need to detect if move was capture or simple. 
       We can check previous board vs new board diff, or metadata. 
       CheckersEngine sends metadata. We can look at `gameData.lastAction`.
       Wait, CheckersEngine doesn't strictly sending `lastAction` like snake ladder.
       I implemented `lastMove` in metadata.
    */

  const moveHistoryLength = (gameData?.metadata as { moveHistory?: unknown[] })?.moveHistory
    ?.length;
  useEffect(() => {
    if (gameData?.metadata?.lastMove) {
      // Heuristic: dist > 1 is capture
      const { from, to } =
        (
          gameData.metadata as {
            lastMove?: { data: { from: { r: number; c: number }; to: { r: number; c: number } } };
          }
        ).lastMove?.data || {};
      if (from && to && Math.abs(from.r - to.r) > 1) playSound('capture');
      else playSound('move');
    }
  }, [moveHistoryLength, playSound, gameData?.metadata]);

  if (!gameData || !board || board.length === 0) return null;

  return (
    <Card className='w-full max-w-4xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_120px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col md:flex-row p-6 md:p-10 rounded-[3rem] border-2'>
      {/* AMBIENT GLOW */}
      <div className='absolute inset-0 pointer-events-none'>
        <div className='absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-red-500/5 blur-[120px] rounded-full' />
        <div className='absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-slate-500/10 blur-[120px] rounded-full' />
      </div>

      {/* LEFT: BOARD */}
      <div className='flex-1 flex items-center justify-center relative z-10'>
        <div className='aspect-square w-full max-w-[500px] bg-[#2e1a14] p-4 rounded-xl border-8 border-[#3d241c] shadow-2xl relative'>
          {/* Grid */}
          <div className='w-full h-full grid grid-cols-8 grid-rows-8 border-[#5c3a2e] border-2'>
            {Array.from({ length: 8 }).map((_, rIndex) =>
              Array.from({ length: 8 }).map((_, cIndex) => {
                // Calculate logical coordinates based on flip state
                const r = isFlipped ? 7 - rIndex : rIndex;
                const c = isFlipped ? 7 - cIndex : cIndex;

                const isDark = (r + c) % 2 === 1;
                const piece = board[r][c];
                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                const isTarget = isMyTurn && selectedPos && !piece && isDark; // Potential target visual aid

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => isDark && handleSquareClick(r, c)}
                    className={cn(
                      'relative flex items-center justify-center',
                      isDark ? 'bg-[#5c3a2e]' : 'bg-[#eecfa1]',
                      isTarget && 'cursor-pointer hover:bg-[#7a4e3e] transition-colors'
                    )}
                  >
                    {/* Coordinate Labels (Optional) */}
                    {/* {c === 0 && isDark && <span className="absolute left-0.5 top-0.5 text-[8px] text-[#eecfa1]/50 font-mono">{r}</span>} */}

                    {piece && (
                      <Piece type={piece.type} color={piece.color} isSelected={isSelected} />
                    )}

                    {/* Highlight valid move target (simple dot) */}
                    {isTarget && selectedPos && (
                      <div className='w-3 h-3 rounded-full bg-white/20 absolute' />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: INFO */}
      <div className='w-full md:w-80 flex flex-col gap-6 relative z-10 mt-8 md:mt-0 md:pl-8 border-l border-white/5'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-black text-white italic uppercase leading-none'>
            Grand <span className='text-red-500'>Checkers</span>
          </h1>
          <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>
            Tactical Warfare
          </p>
        </div>

        <div className='p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-xl flex flex-col items-center gap-6'>
          <div
            className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-t-2 border-white/20',
              players.find((p) => p.id === turn)?.role === 'red' ? 'bg-red-600' : 'bg-slate-200'
            )}
          >
            <Users
              className={cn(
                'w-10 h-10',
                players.find((p) => p.id === turn)?.role === 'red' ? 'text-white' : 'text-slate-800'
              )}
            />
          </div>

          <div className='text-center'>
            <p className='text-xl font-black text-white mb-1'>
              {players.find((p) => p.id === turn)?.name || 'Opponent'}
            </p>
            <div
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                isMyTurn
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 animate-pulse'
                  : 'bg-white/5 text-slate-400 border border-white/10'
              )}
            >
              <Circle className='w-2 h-2 fill-current' />
              {isMyTurn ? 'Your Turn' : 'Thinking...'}
            </div>
          </div>
        </div>

        <div className='flex-1' />

        <div className='grid grid-cols-2 gap-4'>
          <div className='p-3 bg-red-900/20 border border-red-500/20 rounded-2xl text-center'>
            <span className='text-[10px] uppercase text-red-500 font-bold block mb-1'>Red</span>
            <span className='text-2xl font-black text-white'>
              {board.flat().filter((p) => p?.color === 'red').length}
            </span>
          </div>
          <div className='p-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-center'>
            <span className='text-[10px] uppercase text-slate-400 font-bold block mb-1'>White</span>
            <span className='text-2xl font-black text-white'>
              {board.flat().filter((p) => p?.color === 'white').length}
            </span>
          </div>
        </div>

        <Button
          variant='outline'
          onClick={() => endGame()}
          className='h-14 bg-red-500/10 border-red-500/20 text-red-400 rounded-2xl hover:bg-red-500/20 transition-all text-xs font-black uppercase tracking-widest w-full'
        >
          <RotateCcw className='w-4 h-4 mr-2' /> Forfeit
        </Button>
      </div>

      <GameResultOverlay
        winnerId={winner || null}
        players={players}
        localUserId={user?.id || ''}
        isHost={isHost}
        onRematch={() =>
          socket?.emit('start-game', {
            roomId,
            type: 'checkers',
            players: players.map((p) => p.id),
          })
        }
        onEndGame={() => endGame()}
        gameType='checkers'
      />
    </Card>
  );
};
