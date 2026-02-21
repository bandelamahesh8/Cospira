
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Star, ListOrdered, Zap, Crown, Gem, ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { ThreeDDice } from './ui/ThreeDDice';
import confetti from 'canvas-confetti';
import { GameResultOverlay } from './ui/GameResultOverlay';

// --- COORDINATE SYSTEM ---
const PATH_COORDS = [
    {x:9, y:2}, {x:9, y:3}, {x:9, y:4}, {x:9, y:5}, {x:9, y:6}, 
    {x:10, y:7}, {x:11, y:7}, {x:12, y:7}, {x:13, y:7}, {x:14, y:7}, {x:15, y:7}, {x:15, y:8}, 
    {x:15, y:9}, {x:14, y:9}, {x:13, y:9}, {x:12, y:9}, {x:11, y:9}, {x:10, y:9}, 
    {x:9, y:10}, {x:9, y:11}, {x:9, y:12}, {x:9, y:13}, {x:9, y:14}, {x:9, y:15}, {x:8, y:15}, 
    {x:7, y:15}, {x:7, y:14}, {x:7, y:13}, {x:7, y:12}, {x:7, y:11}, {x:7, y:10}, 
    {x:6, y:9}, {x:5, y:9}, {x:4, y:9}, {x:3, y:9}, {x:2, y:9}, {x:1, y:9}, {x:1, y:8}, 
    {x:1, y:7}, {x:2, y:7}, {x:3, y:7}, {x:4, y:7}, {x:5, y:7}, {x:6, y:7}, 
    {x:7, y:6}, {x:7, y:5}, {x:7, y:4}, {x:7, y:3}, {x:7, y:2}, {x:7, y:1}, {x:8, y:1}, {x:9, y:1}
];

export const LudoGame = () => {
    const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
    const { user } = useAuth();
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    const gameData = useMemo(() => (gameState && gameState.type === 'ludo' ? gameState : null), [gameState]);
    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const phase = gameData?.phase || 'ROLL';
    const turn = gameData?.turn;
    const dice = gameData?.dice;
    const winner = gameData?.winner;
    const scores = useMemo(() => (gameState as { scores?: Record<string, number> })?.scores || {}, [gameState]);

    const isMyTurn = turn === user?.id;
    const prevAction = useRef<{ type: string; tokenIndex?: number } | null>(null);

    const playSound = useCallback((type: 'roll' | 'move' | 'kill' | 'win') => {
        const sounds = {
            roll: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
            move: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
            kill: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
            win:  'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
        };
        new Audio(sounds[type]).play().catch(() => {});
    }, []);

    const [activeReactions, setActiveReactions] = useState<{pIdx: number, emoji: string, id: number}[]>([]);

    useEffect(() => {
        if (!gameData?.lastAction || JSON.stringify(gameData.lastAction) === JSON.stringify(prevAction.current)) return;
        prevAction.current = gameData.lastAction;
        const { type } = gameData.lastAction;
        if (type === 'ROLL') playSound('roll');
        if (type === 'MOVE') playSound('move');
        if (type === 'KILL') playSound('kill');
        if (type === 'WIN') {
            playSound('win');
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        }
    }, [gameData?.lastAction, playSound]);

    // Handle incoming reactions
    useEffect(() => {
        if (!socket) return;
        const handleReaction = ({ userId, emoji }: { userId: string, emoji: string }) => {
            const pIdx = players.findIndex(p => p.id === userId);
            if (pIdx !== -1) showReaction(pIdx, emoji);
        };
        socket.on('game-reaction', handleReaction);
        return () => { socket.off('game-reaction', handleReaction); };
    }, [socket, players]);

    const showReaction = (pIdx: number, emoji: string) => {
        const id = Date.now();
        setActiveReactions(prev => [...prev, { pIdx, emoji, id }]);
        setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 2000);
    };

    if (!gameData) return null;

    const handleAction = (type: 'roll' | 'move', tokenIndex?: number) => {
        if (!isMyTurn || !roomId) return;
        if (type === 'roll' && phase === 'ROLL') {
            socket?.emit('game-ludo-roll', { roomId });
        } else if (type === 'move' && phase === 'MOVE' && tokenIndex !== undefined) {
            socket?.emit('game-ludo-move', { roomId, tokenIndex });
        }
    };

    const getCoords = (pIdx: number, pos: number, tIdx: number) => {
        if (pos === 0) {
            const basePositions = [
                [{x:3, y:12}, {x:5, y:12}, {x:3, y:14}, {x:5, y:14}], // Red (BL)
                [{x:3, y:3}, {x:5, y:3}, {x:3, y:5}, {x:5, y:5}],   // Green (TL)
                [{x:12, y:3}, {x:14, y:3}, {x:12, y:5}, {x:14, y:5}], // Yellow (TR)
                [{x:12, y:12}, {x:14, y:12}, {x:12, y:14}, {x:14, y:14}] // Blue (BR)
            ];
            return basePositions[pIdx][tIdx];
        }
        if (pos === 57) return { x: 8, y: 8 };
        if (pos <= 51) {
            const offsets = [39, 0, 13, 26]; 
            return PATH_COORDS[(offsets[pIdx] + pos - 1) % 52];
        }
        const step = pos - 52;
        if (pIdx === 1) return { x: 8, y: step + 2 }; // Green (Top)
        if (pIdx === 2) return { x: 14 - step, y: 8 }; // Yellow (Right)
        if (pIdx === 3) return { x: 8, y: 14 - step }; // Blue (Bottom)
        if (pIdx === 0) return { x: step + 2, y: 8 }; // Red (Left)
        return { x: 8, y: 8 };
    };

    const isComingSoon = false; // Set to true to show 'Under Development' screen

    if (isComingSoon) {
        return (
            <Card className="w-full max-w-4xl mx-auto bg-[#0a0f1e] border-slate-800 shadow-[0_0_100px_rgba(138,43,226,0.2)] relative overflow-hidden flex flex-col items-center justify-center p-20 rounded-[4rem] border-2">
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
                
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 text-center space-y-8"
                >
                    <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border-4 border-white/20 rounded-[3rem]"
                        />
                        <Zap className="w-16 h-16 text-white fill-white/20 animate-pulse" />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic italic">
                            Ludo <span className="text-purple-500">King</span>
                        </h1>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
                            <Star className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-[.3em]">Under Construction</span>
                        </div>
                    </div>

                    <p className="text-slate-400 font-medium max-w-md mx-auto leading-relaxed uppercase tracking-widest text-[10px]">
                        The Ultimate Arena is currently being forged. <br/> Stay tuned for a high-fidelity multiplayer experience.
                    </p>

                    <Button 
                        variant="outline" 
                        onClick={() => endGame()}
                        className="h-14 px-10 border-white/10 text-white rounded-2xl font-black uppercase tracking-[.3em] text-[10px] hover:bg-white/5"
                    >
                        Return to Lobby
                    </Button>
                </motion.div>
                
                {/* DECORATIVE ELEMENTS */}
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/5 blur-[100px] rounded-full" />
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/5 blur-[100px] rounded-full" />
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-5xl mx-auto bg-[#1a1a2e] border-[#8a2be2] shadow-[0_0_100px_rgba(138,43,226,0.3)] relative overflow-hidden flex flex-col lg:flex-row p-4 lg:p-8 rounded-[3rem] border-4">
            
            {/* AMBIENT GLOW */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#8a2be2]/10 to-transparent pointer-events-none" />

            {/* THE LUDO BOARD (Replicating exact layout from the image) */}
            <div className="flex-1 relative aspect-square max-w-[600px] mx-auto p-2 bg-[#8a2be2] rounded-[3rem] shadow-2xl border-b-8 border-[#5e17a3]">
                <div 
                    className="w-full h-full bg-[#f0f0f5] rounded-[2.5rem] relative overflow-hidden grid p-1 shadow-inner"
                    style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}
                >
                    
                    {/* BASE ZONES (Large circular hubs) */}
                    <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-[#27ae60] flex items-center justify-center rounded-[2rem] border-b-4 border-black/10">
                         <div className="w-[85%] h-[85%] bg-white rounded-full shadow-lg flex items-center justify-center relative overflow-hidden">
                             <div className="w-[80%] h-[80%] border-4 border-emerald-500/20 rounded-full flex items-center justify-center">
                                 <div className="p-4 bg-emerald-100/50 rounded-2xl rotate-45 border-4 border-emerald-500 shadow-xl">
                                     <Crown className="w-12 h-12 text-emerald-600 -rotate-45" />
                                 </div>
                             </div>
                         </div>
                    </div>
                    <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#f1c40f] flex items-center justify-center rounded-[2rem] border-b-4 border-black/10">
                         <div className="w-[85%] h-[85%] bg-white rounded-full shadow-lg flex items-center justify-center relative">
                             <div className="grid grid-cols-2 gap-4">
                                 {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-yellow-500 shadow-md border-2 border-yellow-600/30" />)}
                             </div>
                         </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#e74c3c] flex items-center justify-center rounded-[2rem] border-t-4 border-black/10">
                         <div className="w-[85%] h-[85%] bg-white rounded-full shadow-lg flex items-center justify-center relative">
                             <div className="grid grid-cols-2 gap-4">
                                 {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-red-600 shadow-md border-2 border-red-700/30" />)}
                             </div>
                         </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-[#3498db] flex items-center justify-center rounded-[2rem] border-t-4 border-black/10">
                         <div className="w-[85%] h-[85%] bg-white rounded-full shadow-lg flex items-center justify-center relative">
                             <div className="grid grid-cols-2 gap-4">
                                 {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full bg-blue-500 shadow-md border-2 border-blue-600/30" />)}
                             </div>
                         </div>
                    </div>

                    {/* PATHWAY GRID (15x15) */}
                    {Array.from({ length: 225 }).map((_, i) => {
                        const r = Math.floor(i / 15) + 1;
                        const c = (i % 15) + 1;
                        
                        // Layout Logic
                        const isSafe = (r === 7 && c === 2) || (r === 2 && c === 9) || (r === 9 && c === 14) || (r === 14 && c === 7) ||
                                     (r === 9 && c === 3) || (r === 3 && c === 7) || (r === 7 && c === 13) || (r === 13 && c === 9);

                        const isGreenStretch = c === 8 && r >= 2 && r <= 7;
                        const isYellowStretch = r === 8 && c >= 9 && c <= 14;
                        const isBlueStretch = c === 8 && r >= 9 && r <= 14;
                        const isRedStretch = r === 8 && c >= 2 && c <= 7;

                        const isPath = (r >= 7 && r <= 9) || (c >= 7 && c <= 9);
                        const isHomeBase = !isPath;

                        if (isHomeBase) return <div key={i} className="bg-transparent" />;

                        // Path Arrows mapping from image
                        const isGreenEnter = r === 2 && c === 9;
                        const isYellowEnter = r === 9 && c === 14;
                        const isBlueEnter = r === 14 && c === 7;
                        const isRedEnter = r === 7 && c === 2;

                        return (
                            <div key={i} className={cn(
                                "relative border-[0.5px] border-slate-300 transition-all flex items-center justify-center",
                                isGreenStretch ? "bg-[#27ae60]" :
                                isYellowStretch ? "bg-[#f1c40f]" :
                                isBlueStretch ? "bg-[#3498db]" :
                                isRedStretch ? "bg-[#e74c3c]" :
                                "bg-white"
                            )}>
                                {isSafe && <Star className="w-[80%] h-[80%] text-slate-400 fill-slate-200" />}
                                
                                {/* Path entry arrows */}
                                {isGreenEnter && <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center shadow-inner"><ChevronDown className="w-full h-full text-white stroke-[4]" /></div>}
                                {isYellowEnter && <div className="absolute inset-0 bg-yellow-400 flex items-center justify-center shadow-inner"><ChevronLeft className="w-full h-full text-white stroke-[4]" /></div>}
                                {isBlueEnter && <div className="absolute inset-0 bg-blue-500 flex items-center justify-center shadow-inner"><ChevronUp className="w-full h-full text-white stroke-[4]" /></div>}
                                {isRedEnter && <div className="absolute inset-0 bg-red-500 flex items-center justify-center shadow-inner"><ChevronRight className="w-full h-full text-white stroke-[4]" /></div>}

                                {/* Decorative Curved Arrows from Image */}
                                {r === 7 && c === 1 && <ChevronRight className="absolute -left-1 w-4 h-4 text-slate-400 opacity-50" />}
                                {r === 1 && c === 9 && <ChevronDown className="absolute -top-1 w-4 h-4 text-slate-400 opacity-50" />}
                                {r === 9 && c === 15 && <ChevronLeft className="absolute -right-1 w-4 h-4 text-slate-400 opacity-50" />}
                                {r === 15 && c === 7 && <ChevronUp className="absolute -bottom-1 w-4 h-4 text-slate-400 opacity-50" />}
                            </div>
                        );
                    })}

                    {/* CENTRAL HOME CROSS */}
                    <div className="absolute inset-[40%] bg-white rounded-2xl z-20 shadow-[-10px_-10px_30px_rgba(0,0,0,0.1),10px_10px_30px_rgba(255,255,255,0.8)] flex items-center justify-center overflow-hidden">
                         <div className="absolute inset-0 flex items-center justify-center">
                             {/* Large colored triangles meeting in middle */}
                             <div className="absolute inset-[-50%] grid grid-cols-2 grid-rows-2 -rotate-45">
                                 <div className="bg-[#27ae60] shadow-inner" />
                                 <div className="bg-[#f1c40f] shadow-inner" />
                                 <div className="bg-[#e74c3c] shadow-inner" />
                                 <div className="bg-[#3498db] shadow-inner" />
                             </div>
                             <div className="z-10 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-white">
                                 <Gem className="w-8 h-8 text-indigo-600 animate-pulse" />
                             </div>
                         </div>
                    </div>

                    {/* TOKENS DESIGN */}
                    <div 
                        className="absolute inset-0 grid pointer-events-none z-30"
                        style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}
                    >
                        {players.map((p, pIdx) => (
                            (p.tokens || [0,0,0,0]).map((pos, tIdx) => {
                                const { x, y } = getCoords(pIdx, pos, tIdx);
                                const isMovable = isMyTurn && phase === 'MOVE' && p.id === user?.id;
                                
                                return (
                                    <motion.div
                                        key={`${p.id}-${tIdx}`}
                                        animate={{ gridColumn: x, gridRow: y }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                        className="w-full h-full p-[15%] pointer-events-auto flex items-center justify-center"
                                    >
                                        <motion.div 
                                            onClick={() => isMovable && handleAction('move', tIdx)}
                                            whileHover={isMovable ? { scale: 1.25, rotate: 5 } : {}}
                                            animate={isMovable ? { y: [0, -6, 0], scale: [1, 1.15, 1] } : {}}
                                            transition={isMovable ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : {}}
                                            className={cn(
                                                "w-full h-full rounded-full cursor-pointer relative shadow-[0_8px_15px_rgba(0,0,0,0.3)] border-b-4",
                                                p.color === 'red' ? 'bg-[#e74c3c] border-[#c0392b]' :
                                                p.color === 'green' ? 'bg-[#27ae60] border-[#219150]' :
                                                p.color === 'yellow' ? 'bg-[#f1c40f] border-[#f39c12]' :
                                                'bg-[#3498db] border-[#2980b9]'
                                            )}
                                        >
                                            <div className="absolute inset-[15%] rounded-full bg-white/20 border border-white/50" />
                                            {isMovable && (
                                                <div className="absolute inset-[-6px] rounded-full border-4 border-white/50 animate-ping" />
                                            )}
                                        </motion.div>
                                    </motion.div>
                                );
                            })
                        ))}
                    </div>
                </div>
            </div>

            {/* INTERFACE PANEL */}
            <div className="w-full lg:w-[400px] flex flex-col gap-6 relative z-10 pt-8 lg:pt-0">
                <div className="space-y-2 text-center lg:text-left">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#8a2be2]/10 rounded-full border border-[#8a2be2]/20 mb-2">
                        <Zap className="w-4 h-4 text-[#8a2be2] fill-[#8a2be2]/20" />
                        <span className="text-[10px] font-black text-[#8a2be2] uppercase tracking-[.3em]">
                            {gameData?.metadata?.isTeamMode ? "Team Battle 2v2" : "Season 1"}
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-widest leading-none uppercase">Ludo <span className="text-[#8a2be2] drop-shadow-lg">King</span></h1>
                    <div className="flex items-center justify-center lg:justify-start gap-4">
                        <Button variant="ghost" className="text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest gap-2" onClick={() => setShowLeaderboard(!showLeaderboard)}>
                             <ListOrdered className="w-4 h-4" /> Hall of Fame
                        </Button>
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    <AnimatePresence mode="wait">
                         {showLeaderboard ? (
                             <motion.div key="stats" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-4 backdrop-blur-xl">
                                  <h3 className="text-sm font-black text-[#8a2be2] uppercase tracking-widest mb-4">Current Standings</h3>
                                  {players.sort((a,b) => (scores[b.id]||0) - (scores[a.id]||0)).map((p, i) => (
                                      <div key={p.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-[#8a2be2]/50 transition-all">
                                           <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-black text-xs text-indigo-400">{i+1}</div>
                                           <p className="flex-1 font-bold text-white uppercase text-xs truncate">{p.name}</p>
                                           <p className="font-black text-[#8a2be2]">{scores[p.id] || 0} pts</p>
                                      </div>
                                  ))}
                                  <Button variant="link" className="text-slate-500 w-full mt-2 text-[10px]" onClick={() => setShowLeaderboard(false)}>BACK TO ACTION</Button>
                             </motion.div>
                         ) : (
                             <motion.div key="controls" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                 <div className="p-6 bg-white/5 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden group backdrop-blur-md">
                                     <div className="flex items-center gap-5 mb-6">
                                         <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl border-t-2 border-white/20 transition-all", 
                                             players.find(p => p.id === turn)?.color === 'red' ? 'bg-[#e74c3c]' :
                                             players.find(p => p.id === turn)?.color === 'green' ? 'bg-[#27ae60]' :
                                             players.find(p => p.id === turn)?.color === 'yellow' ? 'bg-[#f1c40f]' : 'bg-[#3498db]'
                                         )}>
                                             <Users className="w-8 h-8 text-white" />
                                         </div>
                                         <div className="flex-1">
                                             <div className="flex items-center gap-2">
                                                 <p className="text-xl font-black text-white truncate w-32">{players.find(p => p.id === turn)?.name.split(' ')[0]}</p>
                                                 {gameData?.metadata?.isTeamMode && (
                                                     <span className={cn(
                                                         "text-[9px] px-1.5 py-0.5 rounded font-black uppercase text-white",
                                                         (players.findIndex(p => p.id === turn) === 0 || players.findIndex(p => p.id === turn) === 2) ? "bg-orange-500" : "bg-cyan-500"
                                                     )}>
                                                         {(players.findIndex(p => p.id === turn) === 0 || players.findIndex(p => p.id === turn) === 2) ? "TEAM A" : "TEAM B"}
                                                     </span>
                                                 )}
                                             </div>
                                             <div className="flex items-center gap-2 mt-1">
                                                 <div className={cn("w-2 h-2 rounded-full", isMyTurn ? "bg-emerald-500 animate-pulse" : "bg-slate-600")} />
                                                 <span className="text-[10px] font-black text-slate-500 mb-0">{isMyTurn ? "YOUR TURN" : "WAITING..."}</span>
                                             </div>
                                         </div>
                                     </div>

                                     <div className="flex items-center justify-between gap-4">
                                         <div className="p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                                             <ThreeDDice value={dice || 1} rolling={phase === 'ROLL' && isMyTurn} size={64} />
                                         </div>
                                         {isMyTurn && phase === 'ROLL' && (
                                             <Button 
                                                 className="flex-1 h-20 bg-[#8a2be2] hover:bg-[#9d4edd] font-black text-2xl rounded-2xl shadow-xl shadow-[#8a2be2]/30 active:scale-95 transition-all text-white border-b-4 border-[#5e17a3]"
                                                 onClick={() => handleAction('roll')}
                                             >
                                                 ROLL
                                             </Button>
                                         )}
                                         {isMyTurn && phase === 'MOVE' && (
                                             <p className="flex-1 text-center font-black animate-bounce text-[#8a2be2] text-4xl">{dice}</p>
                                         )}
                                     </div>
                                 </div>
                                 
                                 {/* EMOJI BAR */}
                                 <div className="flex gap-2 justify-center p-2 bg-white/5 rounded-2xl border border-white/5">
                                    {['🔥', '😂', '😡', '👍', '😱', '🎉'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => {
                                                socket?.emit('game-reaction', { roomId, emoji });
                                                // Optimistic local show?
                                                const myIdx = players.findIndex(p => p.id === user?.id);
                                                if(myIdx !== -1) showReaction(myIdx, emoji);
                                            }}
                                            className="text-xl hover:scale-125 transition-transform active:scale-95 p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                 </div>

                                 <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-slate-500 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={() => endGame()}>Surrender Match</Button>
                             </motion.div>
                         )}
                    </AnimatePresence>
                </div>
            </div>

            {/* VICTORY OVERLAY */}
            <GameResultOverlay 
                winnerId={winner || null}
                players={players}
                localUserId={user?.id || ''}
                isHost={isHost}
                onRematch={() => socket?.emit('start-game', { roomId, type: 'ludo', players: players.map(p => p.id) })}
                onEndGame={() => endGame()}
                gameType="ludo"
            />
        </Card>
    );
};
