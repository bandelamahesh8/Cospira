import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { type GameState, type GamePlayer as Player } from '@/types/websocket';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ListOrdered,
  Zap,
  Crown,
  BrainCircuit,
  Target,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { ThreeDDice } from './ui/ThreeDDice';
import confetti from 'canvas-confetti';
import { GameResultOverlay } from './ui/GameResultOverlay';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { LudoBoard3D } from './ludo-3d/LudoBoard3D';
import { LudoToken3D } from './ludo-3d/LudoToken3D';
import { LudoDice3D } from './ludo-3d/LudoDice3D';
import { Suspense } from 'react';
import { Physics } from '@react-three/rapier';

// --- CONSTANTS ---
// Path coordinates and 3D mapping have been moved to LudoConfig.ts

const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
const PLAYER_OFFSETS = [39, 0, 13, 26]; // Red, Green, Yellow, Blue

interface LudoToken {
  id: string;
  playerId: string;
  position: number;
  color: 'red' | 'blue' | 'green' | 'yellow';
}

export const LudoGame = () => {
  const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
  const { user } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const gameData = useMemo(
    () =>
      gameState && (gameState as GameState).type === 'ludo'
        ? (gameState as unknown as GameState)
        : null,
    [gameState]
  );
  
  const players = useMemo(() => gameData?.players || [], [gameData?.players]);
  const phase = gameData?.phase || 'ROLL';
  const turn = gameData?.turn;
  const dice = gameData?.dice;
  const winner = gameData?.winner;
  const boardTokens = useMemo(
    () => ((gameData?.board as unknown as { tokens: LudoToken[] })?.tokens as LudoToken[]) || [],
    [gameData?.board]
  );
  
  const scores = useMemo(
    () => (gameData?.metadata as { scores?: Record<string, number> })?.scores || {},
    [gameData]
  );

  const isMyTurn = turn === user?.id;
  const prevAction = useRef<{ type: string; tokenIndex?: number } | null>(null);

  const playSound = useCallback((type: 'roll' | 'move' | 'kill' | 'win') => {
    const sounds = {
      roll: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
      move: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
      kill: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
      win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    };
    new Audio(sounds[type]).play().catch(() => {});
  }, []);

  const [, setActiveReactions] = useState<{ pIdx: number; emoji: string; id: number }[]>([]);

  useEffect(() => {
    if (!gameData?.lastAction || JSON.stringify(gameData.lastAction) === JSON.stringify(prevAction.current)) return;
    prevAction.current = gameData.lastAction;
    const { type } = gameData.lastAction;
    if (type === 'ROLL') playSound('roll');
    if (type === 'MOVE') playSound('move');
    if (type === 'KILL') playSound('kill');
    if (type === 'WIN') {
      playSound('win');
      confetti({ particleCount: 300, spread: 120, origin: { y: 0.5 }, colors: ['#8a2be2', '#f1c40f', '#27ae60', '#e74c3c', '#3498db'] });
    }
  }, [gameData?.lastAction, playSound]);

  useEffect(() => {
    if (!socket) return;
    const handleReaction = ({ userId, emoji }: { userId: string; emoji: string }) => {
      const pIdx = players.findIndex((p) => p.id === userId);
      if (pIdx !== -1) showReaction(pIdx, emoji);
    };
    socket.on('game-reaction', handleReaction);
    return () => {
      socket.off('game-reaction', handleReaction);
    };
  }, [socket, players]);

  const showReaction = (pIdx: number, emoji: string) => {
    const id = Date.now();
    setActiveReactions((prev) => [...prev, { pIdx, emoji, id }]);
    setTimeout(() => setActiveReactions((prev) => prev.filter((r) => r.id !== id)), 2000);
  };

  // --- AI ANALYSIS LOGIC ---
  const aiTips = useMemo(() => {
    if (!isMyTurn || !dice || phase !== 'MOVE' || !user?.id) return null;
    
    const myIdx = players.findIndex(p => p.id === user.id);
    if (myIdx === -1) return null;

    const myTokens = boardTokens.filter((t: LudoToken) => t.playerId === user.id);
    const oppTokens = boardTokens.filter((t: LudoToken) => t.playerId !== user.id && t.position >= 0 && t.position <= 51);

    const tips: { type: 'kill' | 'safe' | 'danger' | 'move'; msg: string; priority: number; tIdx: number }[] = [];

    myTokens.forEach((token: LudoToken, tIdx: number) => {
      if (token.position === -1 && dice === 6) {
        tips.push({ type: 'move', msg: `Deploy Token ${tIdx + 1} to the board!`, priority: 2, tIdx });
        return;
      }
      
      if (token.position >= 0 && token.position + dice <= 57) {
        const targetPos = token.position + dice;
        const targetGlobalPos = targetPos <= 51 ? (PLAYER_OFFSETS[myIdx] + targetPos - 1) % 52 : -1;
        
        // Check for kills
        if (targetPos <= 51 && !SAFE_POSITIONS.includes(targetGlobalPos)) {
          const wouldKill = oppTokens.some((op: LudoToken) => {
             const opIdx = players.findIndex(p => p.id === op.playerId);
             const opGlobalPos = (PLAYER_OFFSETS[opIdx] + op.position - 1) % 52;
             return opGlobalPos === targetGlobalPos;
          });
          if (wouldKill) tips.push({ type: 'kill', msg: `Capture opportunity! Move Token ${tIdx + 1}.`, priority: 1, tIdx });
        }

        // Check for entering home safely
        if (targetPos >= 52 && token.position < 52) {
           tips.push({ type: 'safe', msg: `Secure Token ${tIdx + 1} to the safe zone!`, priority: 3, tIdx });
        }

        // Check if currently in danger
        const currGlobalPos = token.position <= 51 && token.position > 0 ? (PLAYER_OFFSETS[myIdx] + token.position - 1) % 52 : -1;
        if (currGlobalPos !== -1 && !SAFE_POSITIONS.includes(currGlobalPos)) {
           const inDanger = oppTokens.some((op: LudoToken) => {
              const opIdx = players.findIndex(p => p.id === op.playerId);
              const opGlobalPos = (PLAYER_OFFSETS[opIdx] + op.position - 1) % 52;
              const dist = (currGlobalPos - opGlobalPos + 52) % 52;
              return dist > 0 && dist <= 6; // Opponent is 1-6 steps behind
           });
           if (inDanger && targetPos <= 57) {
             tips.push({ type: 'danger', msg: `Token ${tIdx + 1} is in DANGER! Move to escape.`, priority: 2, tIdx });
           }
        }
      }
    });

    tips.sort((a, b) => a.priority - b.priority);
    return tips.length > 0 ? tips[0] : { type: 'move', msg: 'Think strategically before your move.', priority: 4, tIdx: -1 };
  }, [isMyTurn, dice, phase, user?.id, players, boardTokens]);


  if (!gameData) return null;

  const handleAction = (type: 'roll' | 'move', tokenIndex?: number) => {
    if (!isMyTurn || !roomId) return;
    if (type === 'roll' && phase === 'ROLL') {
      socket?.emit('game-ludo-roll', { roomId });
    } else if (type === 'move' && phase === 'MOVE' && tokenIndex !== undefined) {
      socket?.emit('game-ludo-move', { roomId, tokenIndex });
    }
  };

  return (
    <Card className='w-full max-w-6xl mx-auto bg-[#0a0f1e] border-[#5e17a3] shadow-[0_0_100px_rgba(138,43,226,0.3)] relative overflow-hidden flex flex-col xl:flex-row p-4 lg:p-8 rounded-[3rem] border-4'>
      {/* AMBIENT GLOW */}
      <div className='absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#8a2be2]/15 to-transparent pointer-events-none' />

      {/* THE 3D LUDO BOARD */}
      <div className='flex-1 relative aspect-square max-w-[800px] w-full mx-auto shadow-2xl rounded-[3rem] overflow-hidden border border-[#5e17a3]/50 ring-4 ring-[#8a2be2]/20 bg-[#0a0f1e]'>
        <Canvas camera={{ position: [0, 16, 12], fov: 45 }} dpr={[1, 2]} shadows>
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={2048} />
            <Environment preset="city" />
            
            <OrbitControls 
              enablePan={false} 
              maxPolarAngle={Math.PI / 2.2} 
              minDistance={10} 
              maxDistance={35}
              dampingFactor={0.05}
            />
            
            <Physics debug={false}>
              <group position={[0, -0.5, 0]}>
                <LudoBoard3D />
                
                {/* Tokens */}
                {players.map((p, pIdx) => {
                   const pTokens = boardTokens.filter((t: LudoToken) => t.playerId === p.id);
                   // Fallback
                   const tokenData = pTokens.length === 4 ? pTokens : [{position:-1},{position:-1},{position:-1},{position:-1}] as LudoToken[];
                   return tokenData.map((tData, tIdx) => {
                       const isMovable = isMyTurn && phase === 'MOVE' && p.id === user?.id && 
                                        ((tData.position === -1 && dice === 6) || (tData.position >= 0 && tData.position + (dice || 0) <= 57));
                       const isAITarget = aiTips?.tIdx === tIdx && p.id === user?.id;

                       return (
                         <LudoToken3D 
                            key={`${p.id}-${tIdx}`}
                            playerIndex={pIdx}
                            tokenIndex={tIdx}
                            position={tData.position}
                            color={p.color as 'red' | 'green' | 'yellow' | 'blue'}
                            isMovable={!!isMovable}
                            onClick={() => handleAction('move', tIdx)}
                            isAiTarget={isAITarget}
                         />
                       );
                   });
                })}

                {/* Dice physics */}
                <LudoDice3D rolling={phase === 'ROLL' && isMyTurn} value={dice || 1} />
              </group>
            </Physics>
          </Suspense>
        </Canvas>
      </div>

      {/* INTERFACE PANEL */}
      <div className='w-full xl:w-[420px] flex flex-col gap-6 relative z-10 pt-8 xl:pt-0'>
        <div className='space-y-4 text-center xl:text-left'>
          <div className='inline-flex items-center gap-3 px-4 py-2 bg-[#8a2be2]/10 rounded-full border border-[#8a2be2]/30 backdrop-blur-md shadow-[0_0_20px_rgba(138,43,226,0.2)]'>
            <Zap className='w-4 h-4 text-[#bf80ff] fill-[#bf80ff]/20 animate-pulse' />
            <span className='text-[11px] font-black text-[#bf80ff] uppercase tracking-[.3em]'>
              {gameData?.metadata?.isTeamMode ? 'Team Battle 2v2' : 'Ludo Advanced'}
            </span>
          </div>
          <h1 className='text-5xl font-black text-white tracking-widest leading-none uppercase drop-shadow-2xl'>
            Ludo <span className='text-transparent bg-clip-text bg-gradient-to-r from-[#8a2be2] to-[#e0aaff]'>King</span>
          </h1>
          
          <div className='flex items-center justify-center xl:justify-start gap-4'>
            <Button
              variant='outline'
              className='border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl backdrop-blur-md transition-all'
              onClick={() => setShowLeaderboard(!showLeaderboard)}
            >
              <ListOrdered className='w-4 h-4 text-indigo-400' /> Hall of Fame
            </Button>
          </div>
        </div>

        <div className='flex-1 space-y-5'>
          <AnimatePresence mode='wait'>
            {showLeaderboard ? (
              <motion.div
                key='stats'
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className='p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4 backdrop-blur-xl shadow-2xl'
              >
                <div className='flex items-center gap-2 mb-6 border-b border-white/10 pb-4'>
                    <Crown className='w-5 h-5 text-yellow-500' />
                    <h3 className='text-sm font-black text-white uppercase tracking-widest'>Leaderboard</h3>
                </div>
                {players
                  .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                  .map((p, i) => (
                    <motion.div
                      whileHover={{ scale: 1.02, x: 10 }}
                      key={p.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-[1.5rem] bg-gradient-to-r border transition-all',
                        i === 0 ? 'from-[#8a2be2]/20 to-transparent border-[#8a2be2]/40 shadow-[0_0_20px_rgba(138,43,226,0.15)]' : 'from-white/5 to-transparent border-white/5'
                      )}
                    >
                      <div className='w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center font-black text-sm text-white shadow-inner border border-white/10'>
                        #{i + 1}
                      </div>
                      <div className='flex-1 overflow-hidden'>
                        <p className='font-bold text-white uppercase text-sm truncate'>{p.name}</p>
                        <p className='text-[10px] text-slate-400 font-bold tracking-widest uppercase'>{p.color} Team</p>
                      </div>
                      <p className='font-black text-2xl text-[#bf80ff]'>{scores[p.id] || 0}</p>
                    </motion.div>
                  ))}
                <Button variant='ghost' className='text-slate-400 hover:text-white w-full mt-4 text-[10px] font-black tracking-[.2em] uppercase' onClick={() => setShowLeaderboard(false)}>
                  Close Rankings
                </Button>
              </motion.div>
            ) : (
              <motion.div key='controls' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='space-y-5'>
                
                {/* AI STRATEGIST PANEL */}
                <div className='p-6 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-[2.5rem] border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.15)] backdrop-blur-xl group relative overflow-hidden'>
                   <div className='absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none' />
                   <div className='flex items-center gap-3 mb-4'>
                      <div className='w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40'>
                         <BrainCircuit className='w-5 h-5 text-indigo-400' />
                      </div>
                      <div>
                         <h3 className='text-xs font-black text-indigo-300 uppercase tracking-widest'>AI Assistant</h3>
                         <p className='text-[10px] text-indigo-200/60 font-medium uppercase'>Real-time Analysis</p>
                      </div>
                   </div>
                   
                   <div className='bg-black/40 rounded-2xl p-4 border border-indigo-500/20'>
                      {!isMyTurn ? (
                         <div className='flex items-center gap-3 text-indigo-300 opacity-70'>
                           <div className='w-2 h-2 bg-indigo-500 rounded-full animate-pulse' />
                           <p className='text-xs font-bold'>Analyzing opponent's strategies...</p>
                         </div>
                      ) : !dice ? (
                         <div className='flex items-center gap-3 text-emerald-400'>
                           <Zap className='w-4 h-4' />
                           <p className='text-xs font-bold leading-tight'>Roll the dice to generate strategic possibilities.</p>
                         </div>
                      ) : aiTips ? (
                         <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className='flex items-start gap-3'>
                            {aiTips.type === 'kill' && <Target className='w-5 h-5 text-red-400 shrink-0 mt-0.5' />}
                            {aiTips.type === 'danger' && <ShieldAlert className='w-5 h-5 text-orange-400 shrink-0 mt-0.5' />}
                            {aiTips.type === 'safe' && <ShieldAlert className='w-5 h-5 text-emerald-400 shrink-0 mt-0.5' />}
                            {aiTips.type === 'move' && <ChevronRight className='w-5 h-5 text-indigo-400 shrink-0 mt-0.5' />}
                            <p className={cn('text-sm font-bold', 
                               aiTips.type === 'kill' ? 'text-red-300' :
                               aiTips.type === 'danger' ? 'text-orange-300' :
                               aiTips.type === 'safe' ? 'text-emerald-300' : 'text-indigo-300'
                            )}>{aiTips.msg}</p>
                         </motion.div>
                      ) : null}
                   </div>
                </div>

                <div className='p-6 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group backdrop-blur-md'>
                  <div className='flex items-center gap-5 mb-6'>
                    <div
                      className={cn(
                        'w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl border-t-2 border-white/30 transition-all',
                        players.find((p) => p.id === turn)?.color === 'red' ? 'bg-gradient-to-br from-[#e74c3c] to-[#c0392b] ring-4 ring-[#e74c3c]/20' :
                        players.find((p) => p.id === turn)?.color === 'green' ? 'bg-gradient-to-br from-[#2ecc71] to-[#27ae60] ring-4 ring-[#2ecc71]/20' :
                        players.find((p) => p.id === turn)?.color === 'yellow' ? 'bg-gradient-to-br from-[#f1c40f] to-[#f39c12] ring-4 ring-[#f1c40f]/20' :
                        'bg-gradient-to-br from-[#3498db] to-[#2980b9] ring-4 ring-[#3498db]/20'
                      )}
                    >
                      <Users className='w-7 h-7 text-white' />
                    </div>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <p className='text-2xl font-black text-white truncate max-w-[150px] shadow-sm'>
                          {(players.find((p) => p.id === turn) as Player)?.name.split(' ')[0] || 'Player'}
                        </p>
                      </div>
                      <div className='flex items-center gap-2 mt-2 bg-black/30 w-fit px-3 py-1 rounded-full border border-white/5'>
                        <div className={cn('w-2.5 h-2.5 rounded-full', isMyTurn ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-600')} />
                        <span className='text-[10px] font-black text-slate-300 uppercase tracking-widest'>
                          {isMyTurn ? 'YOUR TURN' : 'ACTING...'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center justify-between gap-5 bg-black/20 p-4 rounded-[2rem] border border-white/5'>
                    <div className='p-2 bg-black/40 rounded-[1.5rem] border border-white/5 shadow-inner'>
                      {/* 2D Preview Dice */}
                      <ThreeDDice value={dice || 1} rolling={phase === 'ROLL' && isMyTurn} size={70} />
                    </div>
                    {isMyTurn && phase === 'ROLL' && (
                      <Button
                        className='flex-1 h-[86px] bg-gradient-to-r from-[#8a2be2] to-[#6a1b9a] hover:from-[#9d4edd] hover:to-[#7b1fa2] font-black text-2xl rounded-[1.5rem] shadow-[0_10px_30px_rgba(138,43,226,0.4)] active:scale-95 transition-all text-white border-b-4 border-black/20'
                        onClick={() => handleAction('roll')}
                      >
                        ROLL
                      </Button>
                    )}
                    {isMyTurn && phase === 'MOVE' && (
                      <div className='flex-1 flex flex-col items-center justify-center bg-indigo-500/10 rounded-[1.5rem] border border-indigo-500/20 h-[86px]'>
                         <span className='text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1'>Rolled</span>
                         <p className='font-black animate-bounce text-transparent bg-clip-text bg-gradient-to-b from-[#e0aaff] to-[#8a2be2] text-5xl leading-none drop-shadow-lg'>{dice}</p>
                      </div>
                    )}
                    {!isMyTurn && (
                       <div className='flex-1 flex items-center justify-center bg-black/20 rounded-[1.5rem] border border-white/5 h-[86px]'>
                         <p className='text-xs font-black text-slate-500 uppercase tracking-widest opacity-60'>Please Wait</p>
                       </div>
                    )}
                  </div>
                </div>

                <Button
                  variant='ghost'
                  className='w-full h-12 bg-transparent text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-black uppercase tracking-[.2em] text-[10px] transition-all'
                  onClick={() => endGame()}
                >
                  Forfeit Match
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <GameResultOverlay
        winnerId={winner || null}
        players={players}
        localUserId={user?.id || ''}
        isHost={isHost}
        onRematch={() => socket?.emit('start-game', { roomId, type: 'ludo', players: players.map((p) => p.id) })}
        onEndGame={() => endGame()}
        gameType='ludo'
      />
    </Card>
  );
};
