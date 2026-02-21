import { useEffect, useState, useMemo, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { WordBattleGameState } from '@/game-engine/engines/WordBattleEngine';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GameResultOverlay } from './ui/GameResultOverlay';
import { logger } from '@/utils/logger';

export const WordBattleGame = () => {
    const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
    const { user } = useAuth();
    
    // Derived State
    const gameData = useMemo(() => (gameState && gameState.type === 'wordbattle' ? gameState as WordBattleGameState : null), [gameState]);
    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const myScore = gameData?.scores[user?.id || ''] || 0;
    
    const [guess, setGuess] = useState('');
    const [isWrong, setIsWrong] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount and round change
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, [gameData?.round]);

    // Handle correct guess effect locally (optimistic or just reacting to state change)
    const prevRound = useRef(gameData?.round);
    useEffect(() => {
        if (gameData?.round !== prevRound.current) {
            // Round changed! Someone got it right.
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFD700', '#FFA500'] // Gold colors
            });
            setGuess(''); // Clear input
            prevRound.current = gameData?.round;
            if (inputRef.current) inputRef.current.focus();
        }
    }, [gameData?.round]);

    const submitGuess = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!guess.trim() || !roomId) return;
        
        // Optimistic check? No, let server decode.
        // Actually, we can check length to save bandwidth visually
        if (guess.length !== gameData?.scrambledWord.length) {
             triggerShake();
             return;
        }

        socket?.emit('make-game-move', { 
            roomId, 
            move: { 
                type: 'guess', 
                data: { guess: guess.trim() } 
            } 
        });
        
        // We don't clear guess immediately, wait for round change to clear.
        // But if wrong, we want feedback.
        // Since we don't get immediate 'wrong' event, we just rely on round NOT changing quickly.
        // Let's add a small local timeout to trigger shake if round doesn't change in 200ms?
        // Or simplified: Just send it.
    };

    const triggerShake = () => {
        setIsWrong(true);
        setTimeout(() => setIsWrong(false), 500);
    };

    if (!gameData) return null;

    return (
        <Card className="w-full max-w-4xl mx-auto bg-slate-900 border-4 border-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.5)] relative overflow-hidden flex flex-col p-8 min-h-[500px] rounded-[2rem]">
            {/* ARCADE GRID BG */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.9)_2px,transparent_2px),linear-gradient(90deg,rgba(18,18,18,0.9)_2px,transparent_2px)] bg-[size:40px_40px] opacity-20" />

            {/* HEADER / SCOREBOARD */}
            <div className="relative z-10 flex justify-between items-start mb-12">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 italic uppercase drop-shadow-sm">
                        Word Battle
                    </h1>
                    <p className="text-zinc-400 font-bold tracking-widest text-sm">ROUND {gameData.round} / {gameData.maxRounds}</p>
                </div>

                <div className="flex gap-6">
                    {players.map(p => (
                        <div key={p.id} className={cn("text-center p-3 rounded-xl border-2 transition-all", 
                            gameData.scores[p.id] > (gameData.scores[players.find(x=>x.id!==p.id)?.id || ''] || 0) ? "bg-indigo-900/50 border-indigo-500" : "bg-slate-800/50 border-slate-700")}>
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">{p.name}</p>
                            <p className="text-3xl font-black text-white">{gameData.scores[p.id]}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN GAME AREA */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-12">
                
                {/* SCRAMBLED WORD */}
                <motion.div 
                    key={gameData.scrambledWord} // Re-animate on change
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <p className="text-sm font-bold text-indigo-400 uppercase tracking-[0.3em] mb-4">UNSCRAMBLE THIS</p>
                    <div className="flex gap-2 justify-center">
                        {gameData.scrambledWord.split('').map((char, i) => (
                            <motion.div
                                key={`${gameData.round}-${i}`}
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: i * 0.05, type: "spring" }}
                                className="w-16 h-20 bg-white text-slate-900 rounded-lg flex items-center justify-center text-5xl font-black shadow-[0_10px_0_rgba(203,213,225,1)]"
                            >
                                {char}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* INPUT AREA */}
                <form onSubmit={submitGuess} className={cn("w-full max-w-md relative transition-transform", isWrong ? "animate-shake" : "")}>
                    <Input
                        ref={inputRef}
                        value={guess}
                        onChange={(e) => setGuess(e.target.value.toUpperCase())}
                        placeholder="TYPE ANSWER..."
                        className="h-16 text-center text-3xl font-bold bg-slate-800/80 border-slate-600 focus:border-indigo-500 rounded-xl tracking-widest uppercase placeholder:text-slate-600"
                        maxLength={gameData.scrambledWord.length + 2} // Small buffer
                        autoComplete="off"
                        autoFocus
                    />
                    <div className="absolute right-2 top-2 bottom-2">
                        <Button 
                            type="submit" 
                            size="icon"
                            className="h-full w-12 bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                        >
                            ↵
                        </Button>
                    </div>
                </form>
            </div>

            <GameResultOverlay 
                winnerId={gameData.winner}
                players={players}
                localUserId={user?.id || ''}
                isHost={isHost}
                onRematch={() => socket?.emit('start-game', { roomId, type: 'wordbattle', players: players.map(p => p.id) })}
                onEndGame={() => endGame()}
                gameType="wordbattle"
            />
            
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out;
                }
            `}</style>
        </Card>
    );
};
