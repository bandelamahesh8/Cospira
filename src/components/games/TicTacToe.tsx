import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Circle, Zap, ListOrdered } from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from '@/hooks/use-toast';
import { GameResultOverlay } from './ui/GameResultOverlay';
import { TicTacToeEngine } from '@/game-engine/engines/TicTacToeEngine';
import { TicTacToeAI } from '@/game-engine/ai/TicTacToeAI';
import { playerService } from '@/services/PlayerService';
import type { GameState } from '@/game-engine/core/GameEngine.interface';
import { Bot } from 'lucide-react';

export const TicTacToe = () => {
  const { gameState: socketGameState, socket, roomId, endGame, isHost } = useWebSocket();
  const { user } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [engine] = useState(() => new TicTacToeEngine());

  // AI Mode States
  const [isVsAI, setIsVsAI] = useState(false);
  const [isTimeAttack, setIsTimeAttack] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);

  // Determine which game state to use
  // We cast to GameState to ensure consistent property access
  const activeGameState = (isVsAI ? localGameState : socketGameState) as GameState | null;

  const gameData = useMemo(
    () => (activeGameState && activeGameState.type === 'xoxo' ? activeGameState : null),
    [activeGameState]
  );
  const board = useMemo(() => gameData?.board || Array(9).fill(null), [gameData?.board]);
  const players = useMemo(() => gameData?.players || [], [gameData?.players]);
  const currentTurn = gameData?.currentTurn;
  const winner = gameData?.winner;
  const scores = useMemo(
    () => (activeGameState as unknown as { scores?: Record<string, number> })?.scores || {},
    [activeGameState]
  );
  const isTimeAttackActive = gameData?.metadata?.isTimeAttack;

  useEffect(() => {
    if (winner) {
      const end = Date.now() + 5 * 1000;
      const colors = ['#3b82f6', '#a855f7', '#06b6d4', '#ec4899'];
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors,
          zIndex: 10000,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors,
          zIndex: 10000,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();

      if (winner !== 'draw') {
        toast({
          title: '🎊 CONGRATULATIONS! 🎊',
          description: `${players.find((p) => p.id === winner)?.name} is the XOXO Champion! ${!isVsAI ? '(+50 XP)' : ''}`,
          className: 'bg-blue-600 border-none text-white font-black',
        });
      }

      // Track stats when game ends (only for multiplayer matches to prevent farming)
      if (user?.id && gameData && !isVsAI) {
        const result = winner === user.id ? 'win' : winner === 'draw' ? 'draw' : 'loss';
        const opponentElo = 1000; // Default ELO, will be fetched from stats later
        const duration = Math.floor(
          (Date.now() - (gameData.createdAt?.getTime() || Date.now())) / 1000
        );

        playerService
          .updateGameStats(user.id, 'xoxo', result, opponentElo, duration)
          .catch((err) => console.warn('Failed to update stats:', err));

        // Check for first win achievement
        if (result === 'win') {
          playerService
            .unlockAchievement(user.id, 'first_win')
            .catch((err) => console.warn('Failed to unlock achievement:', err));
        }
      }
    }
  }, [winner, players, user, gameData, isVsAI]);

  // Initialize AI Game
  const startAIGame = () => {
    if (!user) return;
    const newGame: GameState = {
      id: 'local-ai',
      type: 'xoxo',
      players: [
        {
          id: user.id,
          name: user.email?.split('@')[0] || 'Player',
          avatarUrl:
            user.user_metadata?.avatar_url ||
            'https://api.dicebear.com/7.x/avataaars/svg?seed=player',
        },
        {
          id: 'ai-bot',
          name: `Bot (${aiDifficulty})`,
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=ai',
        },
      ],
      currentTurn: user.id, // Player goes first
      board: Array(9).fill(null),
      winner: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      metadata: {
        moveHistory: [],
        moveCount: 0,
        // settings: { boardSize: 3, winCondition: 3 } // settings undefined in GameState
      },
    };
    setLocalGameState(newGame);
    setIsVsAI(true);
    toast({
      title: 'Training Mode Activated',
      description: `Playing against AI (${aiDifficulty})`,
    });
  };

  // Timer Logic
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!gameData || winner) return;

    // Reset timer on turn change
    setTimeLeft(30);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurn, winner, gameData]);

  // AI Move Logic
  useEffect(() => {
    if (
      isVsAI &&
      localGameState &&
      !localGameState.winner &&
      localGameState.currentTurn === 'ai-bot'
    ) {
      const timer = setTimeout(() => {
        const board = localGameState.board as (string | null)[];
        // 'O' is AI (Player 2)
        const moveIndex = TicTacToeAI.getBestMove(board, 'O', 3, 3, aiDifficulty);

        if (moveIndex !== -1) {
          const aiMove = {
            playerId: 'ai-bot',
            type: 'move',
            data: { index: moveIndex },
            timestamp: Date.now(),
          };

          const nextState = engine.applyMove(aiMove, localGameState);
          setLocalGameState(nextState);
        }
      }, 600); // Small delay for realism
      return () => clearTimeout(timer);
    }
  }, [isVsAI, localGameState, aiDifficulty, engine]);

  if (!gameData) return null;

  const isMyTurn = currentTurn === user?.id;
  const currentPlayerName = players.find((p) => p.id === currentTurn)?.name || 'Someone';

  const handleCellClick = (index: number) => {
    if (isMyTurn && !board[index] && !winner && gameData) {
      // Client-side validation using game engine
      const move = {
        playerId: user?.id || '',
        type: 'move',
        data: { index },
        timestamp: Date.now(),
      };

      const validation = engine.validateMove(move, gameData as GameState);
      if (!validation.valid) {
        toast({
          title: 'Invalid Move',
          description: validation.reason || 'This move is not allowed',
          variant: 'destructive',
        });
        return;
      }

      if (isVsAI && localGameState) {
        // Determine player symbol based on ID
        // In setup, user is player[0] (X), AI is player[1] (O)
        // engine.applyMove expects valid input
        // We just apply it locally
        const nextState = engine.applyMove(move, localGameState);
        setLocalGameState(nextState);
      } else {
        socket?.emit('make-game-move', { roomId, move: { index } });
      }
    }
  };

  const handleRematch = () => {
    if (isVsAI) {
      startAIGame();
    } else {
      socket?.emit('start-game', {
        roomId,
        type: 'xoxo',
        players: players.map((p) => p.id),
        config: { isTimeAttack },
      });
    }
  };

  return (
    <Card className='w-full max-w-xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_100px_rgba(30,58,138,0.5)] relative overflow-hidden flex flex-col p-8 md:p-12 rounded-[4rem] border-2'>
      {/* AMBIENT BACKGROUND GLOW */}
      <div className='absolute top-0 left-0 w-full h-full pointer-events-none opacity-30'>
        <div className='absolute -top-1/4 -left-1/4 w-3/4 h-3/4 bg-blue-600 blur-[150px] rounded-full' />
        <div className='absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 bg-purple-600 blur-[150px] rounded-full' />
      </div>

      {/* HEADER */}
      <div className='relative z-10 flex justify-between items-center mb-12'>
        <div className='flex items-center gap-5'>
          <div className='w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl rotate-6 transition-all hover:rotate-0 hover:scale-110'>
            <Zap className='w-8 h-8 text-white fill-white/20' />
          </div>
          <div>
            <h2 className='text-4xl font-black text-white tracking-tighter italic uppercase leading-none'>
              XOXO <span className='text-blue-500'>PRO</span>
            </h2>
            <div className='flex items-center gap-2 mt-1'>
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  !winner && isMyTurn
                    ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-600'
                )}
              />
              <span className='text-xs font-black text-slate-500 uppercase tracking-widest'>
                {winner
                  ? 'Match Concluded'
                  : isMyTurn
                    ? 'Your Strategic Move'
                    : `${currentPlayerName.split(' ')[0]}'s Move`}
              </span>
            </div>
          </div>
        </div>

        <div className='flex gap-2'>
          {/* TIME ATTACK TOGGLE */}
          {!isVsAI && !gameData && (
            <Button
              variant={isTimeAttack ? 'default' : 'outline'}
              size='icon'
              onClick={() => setIsTimeAttack(!isTimeAttack)}
              className={cn(
                'w-12 h-12 rounded-2xl border-white/10 text-white hover:bg-white/10',
                isTimeAttack
                  ? 'bg-red-600 hover:bg-red-700 border-red-500 animate-pulse'
                  : 'bg-white/5'
              )}
              title='Time Attack Mode (5s)'
            >
              <Zap className='w-6 h-6' />
            </Button>
          )}

          <Button
            variant={isVsAI ? 'default' : 'outline'}
            size='icon'
            onClick={startAIGame}
            className={cn(
              'w-12 h-12 rounded-2xl border-white/10 text-white hover:bg-white/10',
              isVsAI ? 'bg-blue-600 hover:bg-blue-700 border-blue-400' : 'bg-white/5'
            )}
            title='Training Mode (vs AI)'
          >
            <Bot className='w-6 h-6' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className='w-12 h-12 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10'
          >
            <ListOrdered className='w-6 h-6' />
          </Button>
        </div>
      </div>

      {/* TIME ATTACK BAR / STANDARD TIMER */}
      {!winner && (
        <>
          <div className='mb-2 relative h-2 bg-slate-800 rounded-full overflow-hidden'>
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 30, ease: 'linear', repeat: 0 }}
              key={`${currentTurn}`} // Reset on turn change
              className={cn(
                'absolute h-full rounded-full',
                isMyTurn ? 'bg-blue-500' : 'bg-slate-500'
              )}
            />
          </div>
          <div className='text-center mb-6 text-xs font-bold text-slate-500 tracking-widest uppercase'>
            {timeLeft}s remaining
          </div>
        </>
      )}

      {/* AI DIFFICULTY SELECTOR (Visible only in AI mode) */}
      <AnimatePresence>
        {isVsAI && !winner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className='flex justify-center gap-2 mb-6'
          >
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setAiDifficulty(level)}
                className={cn(
                  'px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border transition-all',
                  aiDifficulty === level
                    ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                    : 'bg-transparent text-slate-500 border-slate-700 hover:border-slate-500'
                )}
              >
                {level}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOARD & LEADERBOARD TRANSITION */}
      <div className='relative z-10 flex-1 min-h-[400px]'>
        <AnimatePresence mode='wait'>
          {!showLeaderboard ? (
            <motion.div
              key='board'
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className='grid grid-cols-3 gap-6 w-full aspect-square max-w-md mx-auto'
            >
              {board.map((cell: string | null, i: number) => {
                const normalizedCell = cell?.toUpperCase();
                return (
                  <motion.button
                    key={i}
                    whileHover={
                      !normalizedCell && !winner
                        ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)' }
                        : {}
                    }
                    whileTap={!normalizedCell && !winner ? { scale: 0.92 } : {}}
                    onClick={() => handleCellClick(i)}
                    className={cn(
                      'relative aspect-square rounded-[2.5rem] border-2 transition-all duration-300 flex items-center justify-center overflow-hidden',
                      !normalizedCell && !winner
                        ? 'bg-white/5 border-white/10 shadow-inner group'
                        : 'bg-slate-900 border-slate-700',
                      normalizedCell === 'X'
                        ? 'bg-blue-600 border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.4)]'
                        : normalizedCell === 'O'
                          ? 'bg-purple-600 border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.4)]'
                          : ''
                    )}
                  >
                    <AnimatePresence mode='wait'>
                      {normalizedCell === 'X' && (
                        <motion.div
                          key='X'
                          initial={{ scale: 0, rotate: -90, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          className='text-white'
                        >
                          <X className='w-20 h-20 md:w-24 md:h-24 stroke-[5]' />
                        </motion.div>
                      )}
                      {normalizedCell === 'O' && (
                        <motion.div
                          key='O'
                          initial={{ scale: 0, rotate: 90, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          className='text-white'
                        >
                          <Circle className='w-16 h-16 md:w-20 md:h-20 stroke-[5]' />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!normalizedCell && !winner && (
                      <div className='absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors' />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key='leaderboard'
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className='w-full max-w-md mx-auto space-y-4 pt-10'
            >
              <h3 className='text-2xl font-black text-white text-center mb-8 uppercase tracking-widest italic'>
                Hall of Fame
              </h3>
              {players
                .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className='flex items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/10 group hover:bg-white/10 transition-all'
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center font-black',
                        idx === 0
                          ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                          : 'bg-slate-800 text-slate-400'
                      )}
                    >
                      {idx + 1}
                    </div>
                    <div className='flex-1'>
                      <p className='text-lg font-bold text-white uppercase'>{p.name}</p>
                      <p className='text-[10px] text-slate-500 font-black tracking-widest'>
                        {p.id === user?.id ? 'YOU' : 'OPPONENT'}
                      </p>
                    </div>
                    <div className='text-2xl font-black text-blue-500 group-hover:scale-110 transition-transform'>
                      {scores[p.id] || 0} <span className='text-[10px] text-slate-600'>PTS</span>
                    </div>
                  </div>
                ))}
              <Button
                variant='ghost'
                className='w-full text-slate-500 hover:text-white mt-10'
                onClick={() => setShowLeaderboard(false)}
              >
                BACK TO GAME
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WINNER OVERLAY / REMATCH */}
      <GameResultOverlay
        winnerId={winner || null}
        players={players}
        localUserId={user?.id || ''}
        isHost={isHost}
        onRematch={handleRematch}
        onEndGame={() => {
          if (isVsAI) {
            setIsVsAI(false);
            endGame(); // Clean up if needed, though mostly visual here
          } else {
            endGame();
          }
        }}
        gameType='xoxo'
      />
    </Card>
  );
};
