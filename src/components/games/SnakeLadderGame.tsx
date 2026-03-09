import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Trophy, Zap, RotateCcw, Monitor, Users } from 'lucide-react';
import { ThreeDDice } from './ui/ThreeDDice';
import { ThreeDCoin } from './ui/ThreeDCoin';
import confetti from 'canvas-confetti';
import { GameResultOverlay } from './ui/GameResultOverlay';

interface PowerUp {
  id: string;
  name: string;
  count: number;
}

const getCoords = (pos: number) => {
  const p = Math.max(1, Math.min(100, pos));
  const idx = p - 1;
  const row = Math.floor(idx / 10);
  const colRaw = idx % 10;
  const col = row % 2 === 0 ? colRaw : 9 - colRaw;
  return { x: col, y: 9 - row }; // Bottom to Top
};

export const SnakeLadderGame = () => {
  const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
  const { user } = useAuth();
  const [isBoardTilted, setIsBoardTilted] = useState(false);

  // Step-by-step animation state
  const [visualPositions, setVisualPositions] = useState<{ [playerId: string]: number }>({});
  const animatingRef = useRef<{ [playerId: string]: boolean }>({});
  const visualPositionsRef = useRef<{ [playerId: string]: number }>({});

  const gameData = useMemo(
    () => (gameState && gameState.type === 'snakeladder' ? gameState : null),
    [gameState]
  );
  const players = useMemo(() => gameData?.players || [], [gameData?.players]);

  // Parse board data with typing
  const board = useMemo(() => {
    if (!gameData?.board) return null;
    return gameData.board as {
      snakes: Record<string, number>;
      ladders: Record<string, number>;
    };
  }, [gameData]);

  // Initialize visual positions
  useEffect(() => {
    if (players.length > 0) {
      setVisualPositions((prev) => {
        const updated = { ...prev };
        players.forEach((p) => {
          if (updated[p.id] === undefined) {
            updated[p.id] = p.pos || 1;
            visualPositionsRef.current[p.id] = p.pos || 1;
          }
        });
        return updated;
      });
    }
  }, [players]);

  // Animate visual positions when server state changes
  useEffect(() => {
    players.forEach((p) => {
      const currentVisual = visualPositionsRef.current[p.id] || 1;
      const target = p.pos || 1;

      if (currentVisual !== target && !animatingRef.current[p.id]) {
        const moveStepByStep = async () => {
          animatingRef.current[p.id] = true;

          let curr = currentVisual;
          const isMove =
            gameData?.lastAction?.type === 'MOVE' && gameData?.lastAction?.playerId === p.id;
          const diceVal = gameData?.dice || 0;

          if (isMove && diceVal > 0) {
            for (let i = 0; i < diceVal; i++) {
              curr++;
              if (curr > 100) break;
              visualPositionsRef.current[p.id] = curr;
              setVisualPositions((prev) => ({ ...prev, [p.id]: curr }));
              await new Promise((r) => setTimeout(r, 250));
            }
            if (curr !== target) {
              await new Promise((r) => setTimeout(r, 400));
              visualPositionsRef.current[p.id] = target;
              setVisualPositions((prev) => ({ ...prev, [p.id]: target }));
            }
          } else {
            visualPositionsRef.current[p.id] = target;
            setVisualPositions((prev) => ({ ...prev, [p.id]: target }));
          }
          animatingRef.current[p.id] = false;
        };
        moveStepByStep();
      }
    });
  }, [players, gameData?.lastAction, gameData?.dice]);

  const phase = gameData?.phase || 'ROLL';
  const turn = gameData?.turn;
  const dice = gameData?.dice;
  const winner = gameData?.winner;

  const isMyTurn = turn === user?.id;
  const prevAction = useRef<{ type: string; effect?: string } | null>(null);

  const playSound = useCallback((type: 'roll' | 'move' | 'snake' | 'ladder' | 'win') => {
    const sounds = {
      roll: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
      move: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
      snake: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
      ladder: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
      win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    };
    new Audio(sounds[type]).play().catch(() => {});
  }, []);

  useEffect(() => {
    if (
      !gameData?.lastAction ||
      JSON.stringify(gameData.lastAction) === JSON.stringify(prevAction.current)
    )
      return;
    prevAction.current = gameData.lastAction;

    const { type, effect } = gameData.lastAction;
    if (type === 'ROLL') playSound('roll');
    if (type === 'MOVE') {
      playSound('move');
      if (effect === 'SNAKE') setTimeout(() => playSound('snake'), 400);
      if (effect === 'LADDER') setTimeout(() => playSound('ladder'), 400);
    }
    if (type === 'WIN') {
      playSound('win');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
  }, [gameData?.lastAction, playSound]);

  if (!gameData) return null;

  const handleAction = () => {
    if (!isMyTurn || !roomId) return;
    if (phase === 'ROLL') socket?.emit('game-sl-roll', { roomId });
    else if (phase === 'MOVE') socket?.emit('game-sl-move', { roomId });
  };

  // SVG Line generator for snakes and ladders
  const renderConnection = (from: number, to: number, color: string, isSnake: boolean) => {
    const start = getCoords(from);
    const end = getCoords(to);
    const x1 = start.x * 10 + 5;
    const y1 = start.y * 10 + 5;
    const x2 = end.x * 10 + 5;
    const y2 = end.y * 10 + 5;

    if (isSnake) {
      // Curvy snake
      const midX = (x1 + x2) / 2 + (Math.random() > 0.5 ? 5 : -5);
      const midY = (y1 + y2) / 2;
      return (
        <path
          key={`s-${from}-${to}`}
          d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
          stroke={color}
          strokeWidth='1.5'
          fill='none'
          strokeLinecap='round'
          className='opacity-70 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]'
        />
      );
    } else {
      // Straight ladder with rungs
      return (
        <line
          key={`l-${from}-${to}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth='2'
          strokeDasharray='1 2'
          className='opacity-60 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]'
        />
      );
    }
  };

  return (
    <Card className='w-full max-w-5xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_120px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col lg:flex-row p-6 lg:p-10 rounded-[4rem] border-2'>
      {/* AMBIENT GLOW */}
      <div className='absolute inset-0 pointer-events-none'>
        <div className='absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-emerald-500/10 blur-[120px] rounded-full' />
        <div className='absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/10 blur-[120px] rounded-full' />
      </div>

      {/* LEFT: THE BOARD */}
      <div className='flex-1 relative aspect-square max-w-[550px] mx-auto perspective-2000 p-4'>
        <motion.div
          animate={{ rotateX: isBoardTilted ? 20 : 0, rotateY: isBoardTilted ? -5 : 0 }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className='w-full h-full bg-slate-900 rounded-[2rem] border-4 border-slate-800 shadow-2xl relative overflow-hidden transform-style-3d'
        >
          {/* COLOR GRADIENT BOARD */}
          <div className='absolute inset-0 grid grid-cols-10 grid-rows-10 p-1'>
            {Array.from({ length: 100 }).map((_, i) => {
              const pos = 100 - i;
              const rowIdx = Math.floor(i / 10);
              const isEvenRow = rowIdx % 2 === 0;
              const colIdx = i % 10;
              const isEvenCol = colIdx % 2 === 0;
              const isDark = (isEvenRow && isEvenCol) || (!isEvenRow && !isEvenCol);

              return (
                <div
                  key={i}
                  className={cn(
                    'relative flex items-center justify-center text-[10px] font-bold border-[0.5px] border-white/5',
                    isDark ? 'bg-slate-800/40' : 'bg-slate-900/40'
                  )}
                >
                  <span className='opacity-30'>{pos}</span>
                  {pos === 100 && <Trophy className='absolute w-4 h-4 text-yellow-500/40' />}
                </div>
              );
            })}
          </div>

          {/* OVERLAY SVG FOR ADDS SNAKES & LADDERS */}
          <svg
            viewBox='0 0 100 100'
            preserveAspectRatio='none'
            className='absolute inset-0 w-full h-full pointer-events-none z-10'
            style={{ width: '100%', height: '100%' }}
          >
            {board?.snakes &&
              Object.entries(board.snakes).map(([f, t]) =>
                renderConnection(Number(f), Number(t), '#ef4444', true)
              )}
            {board?.ladders &&
              Object.entries(board.ladders).map(([f, t]) =>
                renderConnection(Number(f), Number(t), '#22c55e', false)
              )}
          </svg>

          {/* PLAYERS */}
          <div className='absolute inset-0 w-full h-full pointer-events-none'>
            {players.map((p, idx) => {
              const vPos = visualPositions[p.id] || p.pos || 1;
              const { x, y } = getCoords(vPos);
              const samePos = players.filter(
                (o, i) => (visualPositions[o.id] || o.pos || 1) === vPos && i < idx
              ).length;
              const offset = samePos * 2; // pixel offset in 100x100 space

              return (
                <motion.div
                  key={p.id}
                  initial={false}
                  animate={{
                    left: `${x * 10}%`,
                    top: `${y * 10}%`,
                    x: offset,
                    y: offset,
                  }}
                  transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                  className='absolute w-[10%] h-[10%] flex items-center justify-center z-30 pointer-events-auto'
                >
                  <div className='relative group flex items-center justify-center w-full h-full'>
                    <div className='w-[80%] h-[80%] transform-gpu'>
                      <ThreeDCoin color={p.color || 'blue'} size='100%' />
                    </div>
                    <div className='absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[8px] font-black whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50'>
                      {p.name.split(' ')[0]}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* RIGHT: INTERFACE */}
      <div className='w-full lg:w-96 flex flex-col gap-8 relative z-10 pt-10 lg:pt-0'>
        <div className='space-y-2 text-center lg:text-left'>
          <div className='inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4'>
            <Zap className='w-5 h-5 text-emerald-400 fill-emerald-400/20' />
            <span className='text-xs font-black text-emerald-400 uppercase tracking-widest text-[10px]'>
              Grand Duel
            </span>
          </div>
          <h1 className='text-4xl font-black text-white tracking-tighter italic uppercase leading-none'>
            Snakes <br />{' '}
            <span className='text-emerald-500 underline decoration-8 decoration-emerald-500/20 underline-offset-8'>
              Arena
            </span>
          </h1>
        </div>

        <div className='flex-1 space-y-6'>
          <div className='p-8 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-2xl space-y-8'>
            <div className='flex items-center gap-5'>
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-transform',
                  players.find((p) => p.id === turn)?.color === 'red'
                    ? 'bg-red-500 shadow-red-500/20'
                    : players.find((p) => p.id === turn)?.color === 'green'
                      ? 'bg-emerald-500 shadow-emerald-500/20'
                      : players.find((p) => p.id === turn)?.color === 'yellow'
                        ? 'bg-yellow-500 shadow-yellow-500/20'
                        : 'bg-blue-500 shadow-blue-500/20'
                )}
              >
                <Users className='w-7 h-7 text-white' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-xl font-black text-white truncate'>
                  {players.find((p) => p.id === turn)?.name || 'Player'}
                </p>
                <p className='text-[10px] font-black text-slate-500 uppercase tracking-widest'>
                  {isMyTurn ? 'Your Turn' : 'Waiting...'}
                </p>
              </div>
            </div>

            <div className='flex flex-col items-center gap-6'>
              <div className='relative p-4 bg-black/20 rounded-3xl border border-white/5 shadow-inner'>
                <ThreeDDice value={dice || 1} rolling={phase === 'ROLL' && isMyTurn} size={100} />
              </div>

              {/* POWER UPS PANEL */}
              {isMyTurn && phase === 'ROLL' && (
                <div className='flex gap-2 w-full justify-center'>
                  {(
                    (gameData?.metadata as { playerPowerUps?: Record<string, PowerUp[]> })
                      ?.playerPowerUps?.[user?.id || ''] || []
                  ).map((pu) => (
                    <Button
                      key={pu.id}
                      disabled={pu.count <= 0}
                      onClick={() => socket?.emit('game-sl-powerup', { roomId, powerUpId: pu.id })}
                      className={cn(
                        'flex-1 h-12 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-1 transition-all',
                        pu.count > 0 ? 'bg-white/5 hover:bg-white/10' : 'opacity-50 grayscale'
                      )}
                    >
                      <span className='text-[10px] font-black uppercase text-white/70'>
                        {pu.name}
                      </span>
                      <span className='text-xs font-bold text-emerald-400'>x{pu.count}</span>
                    </Button>
                  ))}
                </div>
              )}

              {isMyTurn && (
                <Button
                  onClick={handleAction}
                  className={cn(
                    'w-full h-16 font-black text-xl rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest',
                    phase === 'ROLL'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 animate-pulse'
                  )}
                >
                  {phase === 'ROLL' ? 'Roll Dice 🎲' : `Move ${dice} Steps`}
                </Button>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <Button
              variant='outline'
              onClick={() => setIsBoardTilted(!isBoardTilted)}
              className='h-14 bg-white/5 border-white/10 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all text-xs font-black uppercase tracking-widest'
            >
              <Monitor className='w-4 h-4 mr-2' /> 3D View
            </Button>
            <Button
              variant='outline'
              onClick={() => endGame()}
              className='h-14 bg-white/5 border-white/10 text-slate-400 rounded-2xl hover:bg-red-500/20 hover:text-red-400 transition-all text-xs font-black uppercase tracking-widest'
            >
              <RotateCcw className='w-4 h-4 mr-2' /> Abort
            </Button>
          </div>
        </div>
      </div>

      {/* VICTORY OVERLAY */}
      <GameResultOverlay
        winnerId={winner || null}
        players={players}
        localUserId={user?.id || ''}
        isHost={isHost}
        onRematch={() =>
          socket?.emit('start-game', {
            roomId,
            type: 'snakeladder',
            players: players.map((p) => p.id),
          })
        }
        onEndGame={() => endGame()}
        gameType='snakeladder'
      />
    </Card>
  );
};
