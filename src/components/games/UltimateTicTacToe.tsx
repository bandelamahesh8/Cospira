
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { UltimateTicTacToeEngine } from '@/game-engine/engines/UltimateTicTacToeEngine';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { X, Circle } from 'lucide-react';
import { GameResultOverlay } from './ui/GameResultOverlay';
import { toast } from '@/hooks/use-toast';
import { playerService } from '@/services/PlayerService';
import type { GameState } from '@/game-engine/core/GameEngine.interface';

// Helper to access nested board state safely
interface UltimateBoard {
  cells: (string | null)[][];
  macroBoard: (string | null)[];
  activeBoxIndex: number | null;
}

export const UltimateTicTacToe = () => {
    const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
    const { user } = useAuth();
    const [engine] = useState(() => new UltimateTicTacToeEngine());

    // Filter for correct game type
    const gameData = useMemo(() => (gameState && gameState.type === 'ultimate-xoxo' ? gameState : null), [gameState]);
    
    // Cast board to expected type
    const board = useMemo(() => (gameData?.board as UltimateBoard) || {
        cells: Array(9).fill(null).map(() => Array(9).fill(null)),
        macroBoard: Array(9).fill(null),
        activeBoxIndex: null
    }, [gameData]);

    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const currentTurn = gameData?.turn;
    const winner = gameData?.winner;

    useEffect(() => {
        if (winner) {
             const result = winner === user?.id ? 'win' : winner === 'draw' ? 'draw' : 'loss';
             if (winner !== 'draw') {
                 toast({
                     title: "DOMINATION!",
                     description: `${players.find(p => p.id === winner)?.name} is the Ultimate Champion! (+100 XP)`,
                     className: "bg-amber-600 border-none text-white font-black"
                 });
             }
             
             // Track stats
             if (user?.id && gameData) {
                 const duration = Math.floor((Date.now() - ((gameData as any).createdAt?.getTime() || Date.now())) / 1000);
                 playerService.updateGameStats(user.id, 'ultimate-xoxo', result, 1500, duration)
                     .catch((err) => console.warn('Failed stats', err));
             }
        }
    }, [winner, players, user, gameData]);

    if (!gameData) return null;

    const isMyTurn = currentTurn === user?.id;
    // const myRole = players.find(p => p.id === user?.id)?.role;

    const handleCellClick = (boardIndex: number, cellIndex: number) => {
        if (!isMyTurn || winner) return;

        // Basic client-side pre-validation
        if (board.macroBoard[boardIndex] !== null) return; // Board won
        if (board.cells[boardIndex][cellIndex] !== null) return; // Cell taken
        
        // Active board constraint
        if (board.activeBoxIndex !== null && board.activeBoxIndex !== boardIndex) {
            toast({ title: "Invalid Board", description: "You must play in the highlighted mini-board!", variant: "destructive" });
            return;
        }

        const move = {
            playerId: user?.id || '',
            type: 'move',
            data: { boardIndex, cellIndex },
            timestamp: Date.now()
        };

        const validation = engine.validateMove(move, gameData as unknown as GameState);
        if (validation.valid) {
            socket?.emit('make-game-move', { roomId, move });
        } else {
             toast({ title: "Invalid", description: validation.reason, variant: "destructive" });
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_150px_rgba(234,179,8,0.2)] relative overflow-hidden p-4 md:p-8 rounded-[3rem] border-2">
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                     <div className="flex items-center gap-3 mb-2">
                        <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500 font-bold text-xs uppercase tracking-widest border border-amber-500/30">
                            Ultimate Mode
                        </div>
                        {isMyTurn && !winner && (
                            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-500 font-bold text-xs uppercase tracking-widest border border-emerald-500/30 animate-pulse">
                                Your Turn
                            </div>
                        )}
                     </div>
                     <h1 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase">
                         ULTIMATE <span className="text-amber-500">XOXO</span>
                     </h1>
                </div>
                
                {/* PLAYERS */}
                <div className="flex gap-4">
                     {players.map(p => (
                         <div key={p.id} className={cn("flex flex-col items-center p-3 rounded-2xl border transition-all", 
                             currentTurn === p.id ? "bg-white/10 border-white/20 scale-110 shadow-lg" : "bg-transparent border-transparent opacity-50"
                         )}>
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-1", p.role === 'X' ? 'bg-blue-600' : 'bg-rose-600')}>
                                 {p.role === 'X' ? <X className="w-6 h-6 text-white"/> : <Circle className="w-6 h-6 text-white"/>}
                             </div>
                             <span className="text-[10px] font-black uppercase text-slate-400 max-w-[60px] truncate">{p.name}</span>
                         </div>
                     ))}
                </div>
            </div>

            {/* GAME GRID */}
            <div className="relative aspect-square w-full max-w-[600px] mx-auto grid grid-cols-3 gap-2 md:gap-4 p-2 bg-slate-900/50 rounded-3xl border border-white/5">
                {Array(9).fill(null).map((_, boardIdx) => {
                    const isWon = board.macroBoard[boardIdx];
                    const isActiveTarget = !winner && (board.activeBoxIndex === null || board.activeBoxIndex === boardIdx) && board.macroBoard[boardIdx] === null;
                    
                    return (
                        <motion.div 
                            key={boardIdx}
                            className={cn(
                                "relative grid grid-cols-3 gap-1 p-1 rounded-xl transition-all duration-300",
                                isActiveTarget ? "bg-amber-500/10 ring-2 ring-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]" : "bg-slate-900/40",
                                isWon ? "opacity-90" : ""
                            )}
                        >
                            {/* MINI BOARD CELLS */}
                            {board.cells[boardIdx].map((cell, cellIdx) => (
                                <button
                                    key={`${boardIdx}-${cellIdx}`}
                                    disabled={!!cell || !!isWon || !!winner}
                                    onClick={() => handleCellClick(boardIdx, cellIdx)}
                                    className={cn(
                                        "w-full h-full rounded-md flex items-center justify-center text-sm md:text-lg font-black transition-all",
                                        cell === 'X' ? "text-blue-400 bg-blue-900/20" : cell === 'O' ? "text-rose-400 bg-rose-900/20" : "bg-white/5 hover:bg-white/10",
                                        isActiveTarget && !cell && isMyTurn ? "hover:scale-105 cursor-pointer" : "cursor-default"
                                    )}
                                >
                                    {cell}
                                </button>
                            ))}

                            {/* WIN OVERLAY FOR MINI BOARD */}
                            {isWon && (
                                <div className={cn("absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-[2px] rounded-xl border-2 z-10",
                                    isWon === 'X' ? "border-blue-500/50" : isWon === 'O' ? "border-rose-500/50" : "border-slate-500/50"
                                )}>
                                    {isWon === 'X' && <X className="w-16 h-16 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                                    {isWon === 'O' && <Circle className="w-16 h-16 text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
            
            {/* INSTRUCTIONS */}
            <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm font-medium">
                    {winner ? "Game Over" : isMyTurn ? 
                        (board.activeBoxIndex !== null ? "Play in the highlighted board!" : "Free move! Play anywhere.") : 
                        `Waiting for ${players.find(p => p.id === currentTurn)?.name}...`}
                </p>
            </div>

            <GameResultOverlay 
                winnerId={winner || null}
                players={players}
                localUserId={user?.id || ''}
                isHost={isHost}
                onRematch={() => socket?.emit('start-game', { roomId, type: 'ultimate-xoxo', players: players.map(p => p.id) })}
                onEndGame={() => endGame()}
                gameType="ultimate-xoxo"
            />
        </Card>
    );
};
