
import { useEffect, useMemo, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Users, Circle, ArrowDown } from 'lucide-react';
import { ThreeDCoin } from './ui/ThreeDCoin';
import { GameResultOverlay } from './ui/GameResultOverlay';
import confetti from 'canvas-confetti';

export const ConnectFourGame = () => {
    const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
    const { user } = useAuth();
    
    const gameData = useMemo(() => (gameState && (gameState as any).type === 'connect4' ? gameState : null), [gameState]);
    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const board = useMemo(() => gameData?.board as ('red' | 'yellow' | null)[][] || [], [gameData?.board]);
    const turn = gameData?.turn;
    const winner = gameData?.winner;
    const isMyTurn = turn === user?.id;

    // Sounds
    const playSound = useCallback((type: 'drop' | 'win') => {
        const sounds = {
            drop: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3', // Generic click/drop
            win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
        };
        new Audio(sounds[type]).play().catch(() => {});
    }, []);

    // Effect for win/sounds
    useEffect(() => {
        if (winner) {
            playSound('win');
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
    }, [winner, playSound]);

    // Handle Drop
    const handleDrop = (colIndex: number) => {
        if (!isMyTurn || !roomId || !!winner) return;
        
        // Optimistic check (prevent drop if column full)
        if (board[0] && board[0][colIndex] !== null) return;

        playSound('drop');
        socket?.emit('game-move', { 
            roomId, 
            move: { type: 'drop', data: { col: colIndex } } 
        });
    };

    if (!gameData) return null;

    return (
        <Card className="w-full max-w-4xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_120px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col md:flex-row p-6 md:p-10 rounded-[3rem] border-2">
            
            {/* AMBIENT GLOW */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/10 blur-[120px] rounded-full" />
            </div>

            {/* LEFT: BOARD */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="relative bg-blue-800 p-4 rounded-3xl border-4 border-blue-900 shadow-2xl">
                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-2 md:gap-3 bg-blue-700/50 p-3 md:p-4 rounded-2xl relative z-20">
                         {Array.from({ length: 7 }).map((_, colIdx) => (
                             <div 
                                key={colIdx} 
                                className="flex flex-col gap-2 md:gap-3 relative group"
                                onClick={() => handleDrop(colIdx)}
                             >
                                {/* Column Hover Indicator */}
                                {isMyTurn && !winner && (
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowDown className="w-6 h-6 text-white animate-bounce" />
                                    </div>
                                )}

                                {Array.from({ length: 6 }).map((_, rowIdx) => {
                                    const cell = board[rowIdx] ? board[rowIdx][colIdx] : null;
                                    return (
                                        <div key={`${colIdx}-${rowIdx}`} className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-slate-900/80 shadow-inner overflow-hidden relative">
                                            <AnimatePresence>
                                                {cell && (
                                                    <motion.div
                                                        initial={{ y: -400, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                                        className="w-full h-full p-1"
                                                    >
                                                        <ThreeDCoin color={cell} size="100%" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                             </div>
                         ))}
                    </div>
                    
                    {/* Legs */}
                    <div className="absolute -bottom-8 left-10 w-4 h-12 bg-blue-900 rounded-b-xl z-0" />
                    <div className="absolute -bottom-8 right-10 w-4 h-12 bg-blue-900 rounded-b-xl z-0" />
                </div>
            </div>

            {/* RIGHT: INFO */}
            <div className="w-full md:w-80 flex flex-col gap-6 relative z-10 mt-8 md:mt-0 md:pl-8 border-l border-white/5">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-white italic uppercase leading-none">Connect <span className="text-blue-500">Four</span></h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vertical Strategy</p>
                </div>

                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-xl flex flex-col items-center gap-6">
                    <div className={cn(
                        "w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-t-2 border-white/20",
                        players.find(p => p.id === turn)?.role === 'red' ? 'bg-red-500' : 'bg-amber-400'
                    )}>
                        <Users className="w-10 h-10 text-white" />
                    </div>
                    
                    <div className="text-center">
                        <p className="text-xl font-black text-white mb-1">
                            {players.find(p => p.id === turn)?.name || "Opponent"}
                        </p>
                        <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            isMyTurn ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 animate-pulse" : "bg-white/5 text-slate-400 border border-white/10"
                        )}>
                            <Circle className="w-2 h-2 fill-current" />
                            {isMyTurn ? "Your Turn" : "Thinking..."}
                        </div>
                    </div>
                </div>

                <div className="flex-1" />

                <Button variant="outline" onClick={() => endGame()} className="h-14 bg-red-500/10 border-red-500/20 text-red-400 rounded-2xl hover:bg-red-500/20 transition-all text-xs font-black uppercase tracking-widest w-full">
                    <RotateCcw className="w-4 h-4 mr-2" /> Forfeit
                </Button>
            </div>

            <GameResultOverlay 
                winnerId={winner || null}
                players={players}
                localUserId={user?.id || ''}
                isHost={isHost}
                onRematch={() => socket?.emit('start-game', { roomId, type: 'connect4', players: players.map(p => p.id) })}
                onEndGame={() => endGame()}
                gameType="connect4"
            />
        </Card>
    );
};
