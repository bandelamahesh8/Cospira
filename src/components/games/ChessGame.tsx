
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RotateCcw, Zap, Crown, Shield } from 'lucide-react';

import confetti from 'canvas-confetti';
import { toast } from '@/hooks/use-toast';
import { GameResultOverlay } from './ui/GameResultOverlay';
import { StockfishService } from '@/services/StockfishService';
import { playerService } from '@/services/PlayerService';
import { Bot } from 'lucide-react';
import { WaitingState } from './chess/WaitingState';
import { SyncIndicator } from './chess/SyncIndicator';
import { TimeDisplay } from './chess/TimeDisplay';
import { PlayerAvatar } from './chess/PlayerAvatar';
import { FocusMode } from './chess/FocusMode';
import { CooldownOverlay } from './chess/CooldownOverlay';
import { ReplayTimeline } from './chess/ReplayTimeline';
import { BlunderWarning } from './chess/BlunderWarning';
import { loadSettings, type FeatureToggles } from './chess/SettingsPanel';
import { CHESS_CONFIG } from '@/lib/chess/config';
import { performanceMonitor } from '@/lib/chess/performance';
import { chessSounds } from '@/lib/chess/sounds';
import { useSessionDuration } from '@/hooks/useSessionDuration';
import { detectBlunder, getBlunderDescription } from '@/lib/chess/blunderDetection';
import { loadTheme, type ThemeName } from '@/lib/chess/themes';
export const ChessGame = () => {
    const { gameState, socket, roomId, makeGameMove, endGame, isHost, gameTimeout } = useWebSocket();
    const { user } = useAuth();
    const [stockfish] = useState(() => new StockfishService());
    
    // AI Mode States
    const [isVsAI, setIsVsAI] = useState(false);
    const [isPuzzleMode, setIsPuzzleMode] = useState(false);
    const [_puzzleFen, setPuzzleFen] = useState<string | null>(null);
    const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [localGameActive, setLocalGameActive] = useState(false);
    
    // Stability: Guard against missing data
    // In AI mode, we don't use socket gameData
    const gameData = useMemo(() => (!isVsAI && gameState && gameState.type === 'chess' ? gameState : null), [gameState, isVsAI]);
    const board = gameData?.board;
    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const turn = gameData?.turn;
    const winner = gameData?.winner;
    const isActive = gameData?.isActive;

    const [game, setGame] = useState(new Chess());
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
    const [timeLeft, setTimeLeft] = useState(CHESS_CONFIG.TIMERS.DEFAULT_TURN_TIME);
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const [showSync, setShowSync] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    
    // Phase 3: Psychology & Pressure
    const [opponentThinking, setOpponentThinking] = useState(false);
    const [showCooldown, setShowCooldown] = useState(false);
    const { isFatigued } = useSessionDuration();
    
    // Phase 4: Power User Features
    const [isReplayMode, setIsReplayMode] = useState(false);
    const [replayMoveIndex, setReplayMoveIndex] = useState(0);
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [pendingMove, setPendingMove] = useState<any>(null);
    const [showBlunderWarning, setShowBlunderWarning] = useState(false);
    const [blunderDescription, setBlunderDescription] = useState('');
    
    // Phase 5: Memory & Identity
    const [_boardTheme] = useState<ThemeName>(() => loadTheme());
    const [_userSettings] = useState<FeatureToggles>(() => loadSettings());
    const [_gameStartTime] = useState<number>(Date.now());

    const myRole = useMemo(() => {
        if (isVsAI) return 'white'; // Player is always white vs AI for now
        return players?.find(p => p.id === user?.id)?.role;
    }, [players, user, isVsAI]);

    const isMyTurn = isVsAI ? game.turn() === 'w' : turn === user?.id; // 'w' is white
    const isSpectator = !myRole;

    // Sync local game state with server board (FEN) OR keep AI game state
    useEffect(() => {
        if (!isVsAI && board) {
            try {
                const newGame = new Chess(board);
                setGame(newGame);
            } catch {
                // eslint-disable-next-line no-console
                console.error('Invalid FEN from server:', board);
            }
        }
    }, [board, isVsAI]);

    // Update Stockfish Level
    useEffect(() => {
        stockfish.setDifficulty(aiDifficulty);
    }, [aiDifficulty, stockfish]);

    // AI Move Logic
    useEffect(() => {
        if (isVsAI && localGameActive && game.turn() === 'b' && !game.isGameOver()) {
            // AI is Black
            const fen = game.fen();
            stockfish.getBestMove(fen, (bestMove) => {
                if (bestMove) {
                    // bestMove is like "e2e4"
                    const from = bestMove.substring(0, 2);
                    const to = bestMove.substring(2, 4);
                    const promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : undefined;

                    setGame(prev => {
                        const next = new Chess(prev.fen());
                        try {
                            next.move({ from, to, promotion: promotion || 'q' });
                        } catch {
                             // console.error("AI made invalid move", bestMove);
                        }
                        return next;
                    });
                }
            });
        }
    }, [game, isVsAI, localGameActive, stockfish]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && !winner && isMyTurn) {
            setTimeLeft(CHESS_CONFIG.TIMERS.DEFAULT_TURN_TIME); 
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        gameTimeout?.(); 
                        return 0; 
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setTimeLeft(60); 
        }
        return () => clearInterval(interval);
    }, [isActive, winner, isMyTurn, turn, gameTimeout]);

    useEffect(() => {
        if (winner && winner !== 'draw') {
             confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
             toast({ title: "Checkmate!", description: `${players?.find(p => p.id === winner)?.name} wins! (+50 XP)` });
        }
        
        // Track stats when game ends
        if (winner && user?.id && gameData) {
            const result = winner === user.id ? 'win' : winner === 'draw' ? 'draw' : 'loss';
            const opponentElo = 1200; // Default ELO
            const duration = Math.floor((Date.now() - ((gameData as any).createdAt?.getTime() || Date.now())) / 1000);
            
            playerService.updateGameStats(user.id, 'chess', result, opponentElo, duration)
                .catch((err) => console.warn('Failed to update chess stats:', err));
            
            // Unlock achievements
            if (result === 'win') {
                playerService.unlockAchievement(user.id, 'first_win')
                    .catch((err) => console.warn('Failed to unlock achievement:', err));
                playerService.unlockAchievement(user.id, 'chess_checkmate')
                    .catch((err) => console.warn('Failed to unlock achievement:', err));
            }
        }
    }, [winner, players, user, gameData]);

    // Preload assets on mount
    useEffect(() => {
        performanceMonitor.preloadAssets();
    }, []);

    // Phase 3: Track opponent thinking state
    useEffect(() => {
        if (CHESS_CONFIG.FEATURES.PLAYER_PRESENCE && !isMyTurn && isActive && !winner) {
            setOpponentThinking(true);
        } else {
            setOpponentThinking(false);
        }
    }, [isMyTurn, isActive, winner]);

    // Phase 3: Trigger cooldown after loss
    useEffect(() => {
        if (CHESS_CONFIG.FEATURES.ANTI_RAGE && winner && winner !== user?.id) {
            setShowCooldown(true);
        }
    }, [winner, user]);

    // Phase 3: Calculate focus mode (hide UI when time critical)
    const isFocusMode = CHESS_CONFIG.FEATURES.COGNITIVE_LOAD_CONTROL && 
                        timeLeft <= CHESS_CONFIG.TIMERS.CRITICAL_THRESHOLD && 
                        isMyTurn && 
                        !winner;


    const loadPuzzle = () => {
        // Hardcoded "Mate in 1" puzzle for demo
        const puzzle = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"; // Scholar's Mate setup
        setIsPuzzleMode(true);
        setIsVsAI(false);
        setLocalGameActive(true);
        const pGame = new Chess(puzzle);
        setGame(pGame);
        setPuzzleFen(puzzle);
        toast({ title: "Puzzle: Mate in 1", description: "White to move and win!", className: "bg-purple-600 text-white" });
    };

    const onPieceDragBegin = (_piece: string, sourceSquare: string) => {
        if (!isMyTurn && !isPuzzleMode) return;
        
        setMoveFrom(sourceSquare);

        // Get valid moves for this piece
        const moves = game.moves({
            square: sourceSquare as any,
            verbose: true
        });

        if (moves.length === 0) {
            setOptionSquares({});
            return;
        }

        const newSquares: Record<string, React.CSSProperties> = {};
        moves.map((move) => {
            const targetPiece = game.get(move.to as any);
            const sourcePiece = game.get(sourceSquare as any);
            
            newSquares[move.to] = {
                background:
                    targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color
                        ? 'radial-gradient(circle, rgba(255,0,0,.5) 25%, transparent 25%)'
                        : 'radial-gradient(circle, rgba(0,255,0,.5) 25%, transparent 25%)',
                borderRadius: '50%'
            };
            return move;
        });
        
        newSquares[sourceSquare] = {
            background: 'rgba(255, 255, 0, 0.4)'
        };

        setOptionSquares(newSquares);
    };

    const onDrop = (sourceSquare: string, targetSquare: string) => {
        if (isPuzzleMode) {
             const move = { from: sourceSquare, to: targetSquare, promotion: 'q' };
             try {
                const tempGame = new Chess(game.fen());
                const result = tempGame.move(move);
                if (!result) return false;

                // Check if it's checkmate (Win condition for puzzle)
                if (tempGame.isCheckmate()) {
                    setGame(tempGame);
                    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
                    toast({ title: "PUZZLE SOLVED!", description: "Excellent vision.", className: "bg-emerald-600 text-white font-black" });
                    setTimeout(() => setIsPuzzleMode(false), 3000);
                    return true;
                } else {
                    toast({ title: "Incorrect", description: "Not a checkmate. Try again.", variant: "destructive" });
                    setGame(new Chess(game.fen())); 
                    return false;
                }
             } catch { return false; }
        }

        if (!isVsAI && (!isActive || !isMyTurn || winner || isSpectator)) return false;
        if (isVsAI && (!localGameActive || game.turn() !== 'w')) return false;

        const move = { from: sourceSquare, to: targetSquare, promotion: 'q' };
        try {
            const tempGame = new Chess(game.fen());
            const result = tempGame.move(move);
            if (!result) return false;
            
            if (isVsAI) {
                setGame(tempGame);
                setOptionSquares({});
                setMoveFrom(null);
                // Show sync indicator
                setIsSynced(true);
                setShowSync(true);
                setTimeout(() => setShowSync(false), CHESS_CONFIG.VISUAL.SYNC_INDICATOR_DURATION);
                
                // Play sound
                if (CHESS_CONFIG.FEATURES.SOUND_HAPTICS) {
                    const isCapture = game.get(targetSquare as any);
                    const isCheck = tempGame.isCheck();
                    if (isCheck) chessSounds.playCheck();
                    else if (isCapture) chessSounds.playCapture();
                    else chessSounds.playMove();
                }
                
                return true;
            } else {
                makeGameMove(move);
                setOptionSquares({});
                setMoveFrom(null);
                // Show sync indicator
                setIsSynced(false);
                setShowSync(true);
                // Will be set to true when server confirms
                setTimeout(() => {
                    setIsSynced(true);
                    setTimeout(() => setShowSync(false), 500);
                }, 300);
                
                // Play sound
                if (CHESS_CONFIG.FEATURES.SOUND_HAPTICS) {
                    const isCapture = game.get(targetSquare as any);
                    if (isCapture) chessSounds.playCapture();
                    else chessSounds.playMove();
                }
                
                return true;
            }
        } catch { 
            setOptionSquares({});
            setMoveFrom(null);
            return false; 
        }
    };
    
    // Also handle click to show moves without dragging
    const onSquareClick = (square: string) => {
        if (!isMyTurn && !isPuzzleMode) return;

        // NEW: Check if we are completing a move
        if (moveFrom && moveFrom !== square) {
            const result = onDrop(moveFrom, square);
            if (result) return;
        }
        
        // existing selection logic
        const moves = game.moves({
            square: square as any,
            verbose: true
        });
        
        if (moves.length === 0) {
            setOptionSquares({});
            setMoveFrom(null);
            return;
        }

        setMoveFrom(square);

        const newSquares: Record<string, React.CSSProperties> = {};
        moves.map((move) => {
            const targetPiece = game.get(move.to as any);
            const sourcePiece = game.get(square as any);
            
            if (CHESS_CONFIG.FEATURES.BOARD_INTERACTION_FEEDBACK) {
                // Phase 2: Cyan glow instead of green/red dots
                const isCapture = targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color;
                newSquares[move.to] = {
                    background: isCapture 
                        ? 'radial-gradient(circle, rgba(239,68,68,0.4) 40%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(6,182,212,0.4) 40%, transparent 70%)',
                    boxShadow: isCapture
                        ? '0 0 20px rgba(239,68,68,0.3)'
                        : '0 0 20px rgba(6,182,212,0.3)',
                    borderRadius: '8px',
                    animation: 'pulse 2s ease-in-out infinite',
                };
            } else {
                // Phase 1: Original green/red dots
                newSquares[move.to] = {
                    background:
                        targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color
                            ? 'radial-gradient(circle, rgba(255,0,0,.5) 25%, transparent 25%)'
                            : 'radial-gradient(circle, rgba(0,255,0,.5) 25%, transparent 25%)',
                    borderRadius: '50%'
                };
            }
            return move;
        });
        newSquares[square] = {
            background: 'rgba(255, 255, 0, 0.4)'
        };
        setOptionSquares(newSquares);
    };

    const startAiGame = () => {
        setIsVsAI(true);
        setLocalGameActive(true);
        setGame(new Chess()); // Reset board
        toast({
            title: "Training Mode",
            description: `Playing vs Stockfish (${aiDifficulty})`,
        });
    };

    const boardOrientation = (myRole?.toLowerCase() === 'black') ? 'black' : 'white';
    // In AI mode, mock players for the UI
    const whitePlayer = isVsAI ? { id: user?.id, name: user?.email?.split('@')[0] || 'You', role: 'white' } : players?.find(p => p.role === 'white');
    const blackPlayer = isVsAI ? { id: 'stockfish', name: `Stockfish (${aiDifficulty})`, role: 'black' } : players?.find(p => p.role === 'black');

    if (!gameData && !isVsAI) return null;

    return (
        <Card className={cn(
            "w-full max-w-5xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_120px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col lg:flex-row p-6 lg:p-10 rounded-[4rem] border-2",
            CHESS_CONFIG.FEATURES.ANTI_FATIGUE && isFatigued && "opacity-85"
        )}>
            
            {/* AMBIENT GLOW */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-slate-500/5 blur-[120px] rounded-full" />
            </div>

            {/* LEFT: THE BOARD */}
            <div className="flex-1 relative aspect-square max-w-[550px] mx-auto p-4 flex items-center justify-center">
                  {/* Sync Indicator */}
                  <SyncIndicator synced={isSynced} connected={socket?.connected} show={showSync} />
                  
                  {/* Show waiting state when game not active */}
                  {!isActive && !isVsAI && !localGameActive ? (
                    <div className="w-full h-full relative z-10 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-slate-800">
                      <WaitingState />
                    </div>
                  ) : (
                  <div className="w-full h-full relative z-10 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-slate-800">
                    <Chessboard 
                        position={game.fen()} 
                        onPieceDrop={onDrop}
                        onPieceDragBegin={onPieceDragBegin}
                        onSquareClick={onSquareClick}
                        boardOrientation={boardOrientation}
                        customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                        customLightSquareStyle={{ backgroundColor: '#475569' }}
                        customSquareStyles={{ ...optionSquares }}
                        animationDuration={300}
                    />
                </div>
                  )}
            </div>

            {/* RIGHT: INTERFACE */}
            <div className="w-full lg:w-96 flex flex-col gap-8 relative z-10 pt-10 lg:pt-0">
                <div className="space-y-2 text-center lg:text-left">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4">
                        <Zap className="w-5 h-5 text-blue-400 fill-blue-400/20" />
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest text-[10px]">Grandmaster Edition</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter leading-none italic uppercase">Chess <br/> <span className="text-slate-500 underline decoration-8 decoration-slate-500/20 underline-offset-8">Duel</span></h1>
                    
                    <div className="flex justify-center lg:justify-start gap-2 pt-4">
                        <Button 
                            size="sm"
                            variant={isVsAI ? "default" : "outline"}
                            onClick={startAiGame}
                            className={cn("gap-2", isVsAI ? "bg-blue-600" : "bg-transparent border-slate-700")}
                        >
                            <Bot className="w-4 h-4" /> Practice vs AI
                        </Button>
                        <Button 
                            size="sm"
                            variant={isPuzzleMode ? "default" : "outline"}
                            onClick={loadPuzzle}
                            className={cn("gap-2", isPuzzleMode ? "bg-purple-600" : "bg-transparent border-slate-700")}
                        >
                            <Zap className="w-4 h-4" /> Daily Puzzle
                        </Button>
                        
                        {isVsAI && (
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                {(['easy', 'medium', 'hard'] as const).map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setAiDifficulty(lvl)}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-xs font-bold uppercase transition-all",
                                            aiDifficulty === lvl ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    {/* PLAYERS CARD */}
                    <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-2xl space-y-8">
                        
                        {/* OPPONENT (Top for current player) */}
                        <motion.div 
                            className={cn("flex items-center gap-5 p-4 rounded-3xl transition-all border", 
                                turn === (myRole === 'white' ? blackPlayer?.id : whitePlayer?.id) ? "bg-white/5 border-white/20 scale-105 shadow-xl" : "border-transparent opacity-40")}
                            animate={turn === (myRole === 'white' ? blackPlayer?.id : whitePlayer?.id) ? { 
                                borderColor: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)'] 
                            } : {}}
                            transition={{ duration: CHESS_CONFIG.ANIMATIONS.TURN_PULSE_DURATION / 1000, repeat: 0 }}
                        >
                             {CHESS_CONFIG.FEATURES.PLAYER_PRESENCE ? (
                                 <PlayerAvatar 
                                     name={(myRole === 'white' ? blackPlayer?.name : whitePlayer?.name) || 'Opponent'}
                                     role={myRole === 'white' ? 'black' : 'white'}
                                     isOnline={socket?.connected || false}
                                     isThinking={opponentThinking}
                                 />
                             ) : (
                                 <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10">
                                     {myRole === 'white' ? <Shield className="w-7 h-7 text-slate-400" /> : <Crown className="w-7 h-7 text-white" />}
                                 </div>
                             )}
                             <div className="flex-1 min-w-0">
                                 <p className="text-lg font-black text-white truncate">{myRole === 'white' ? blackPlayer?.name : whitePlayer?.name}</p>
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{myRole === 'white' ? 'Black' : 'White'}</p>
                             </div>
                        </motion.div>

                        {/* ME (Bottom) */}
                        <motion.div 
                            className={cn("flex items-center gap-5 p-4 rounded-3xl transition-all border", 
                                isMyTurn ? "bg-blue-500/10 border-blue-500/20 scale-105 shadow-xl" : "border-transparent opacity-40")}
                            animate={isMyTurn ? { 
                                borderColor: ['rgba(59,130,246,0.2)', 'rgba(59,130,246,0.5)', 'rgba(59,130,246,0.2)'] 
                            } : {}}
                            transition={{ duration: CHESS_CONFIG.ANIMATIONS.TURN_PULSE_DURATION / 1000, repeat: 0 }}
                        >
                             {CHESS_CONFIG.FEATURES.PLAYER_PRESENCE ? (
                                 <PlayerAvatar 
                                     name={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You'}
                                     role={myRole || 'white'}
                                     isOnline={true}
                                     isThinking={false}
                                     isCurrentPlayer={true}
                                 />
                             ) : (
                                 <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                     {myRole === 'white' ? <Crown className="w-7 h-7 text-white" /> : <Shield className="w-7 h-7 text-slate-300" />}
                                 </div>
                             )}
                             <div className="flex-1 min-w-0">
                                 <p className="text-lg font-black text-white truncate">{user?.user_metadata?.display_name || user?.email?.split('@')[0] || "You"}</p>
                                 <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{myRole}</p>
                             </div>
                             <TimeDisplay timeLeft={timeLeft} isMyTurn={isMyTurn} winner={winner} />
                        </motion.div>
                    </div>

                    {/* CONTROL BAR */}
                    <div className="grid grid-cols-1 gap-4">
                        <Button 
                            variant="outline" 
                            onClick={() => endGame()}
                            className="h-16 bg-white/5 border-white/10 text-slate-400 rounded-3xl hover:bg-red-500/20 hover:text-red-400 transition-all font-black uppercase tracking-widest"
                        >
                            <RotateCcw className="w-5 h-5 mr-3" /> SURRENDER
                        </Button>
                    </div>
                </div>
            </div>

            {/* VICTORY MODAL */}
            <GameResultOverlay 
                winnerId={winner || null}
                players={players}
                localUserId={user?.id || ''}
                isHost={isHost}
                onRematch={() => socket?.emit('start-game', { roomId, type: 'chess', players: players?.map(p => p.id) })}
                onEndGame={() => endGame()}
                gameType="chess"
            />

            {/* Phase 3: Cooldown Overlay */}
            <CooldownOverlay 
                show={showCooldown} 
                onComplete={() => {
                    setShowCooldown(false);
                }}
            />

            {/* Phase 4: Blunder Warning */}
            <BlunderWarning 
                show={showBlunderWarning}
                description={blunderDescription}
                onConfirm={() => {
                    // Execute the pending move
                    if (pendingMove) {
                        const tempGame = new Chess(game.fen());
                        tempGame.move(pendingMove);
                        setGame(tempGame);
                        makeGameMove(pendingMove);
                    }
                    setShowBlunderWarning(false);
                    setPendingMove(null);
                }}
                onCancel={() => {
                    setShowBlunderWarning(false);
                    setPendingMove(null);
                }}
            />

            {/* Phase 4: Replay Timeline (shown after game ends) */}
            {winner && CHESS_CONFIG.FEATURES.REPLAY_READY && moveHistory.length > 0 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
                    <ReplayTimeline 
                        moves={moveHistory}
                        currentMoveIndex={replayMoveIndex}
                        onSeek={(index) => {
                            setReplayMoveIndex(index);
                            setIsReplayMode(true);
                            // TODO: Implement replay seek logic
                        }}
                    />
                </div>
            )}
        </Card>
    );
};
