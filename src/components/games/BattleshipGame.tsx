
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Crosshair, Anchor, RefreshCw, Swords, Play } from 'lucide-react';
import { GameResultOverlay } from './ui/GameResultOverlay';
import confetti from 'canvas-confetti';

type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

const SHIP_SIZES: Record<ShipType, number> = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2
};

export const BattleshipGame = () => {
    const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
    const { user } = useAuth();
    
    // Game Data
    const gameData = useMemo(() => (gameState && (gameState as any).type === 'battleship' ? gameState : null), [gameState]);
    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const phase = useMemo(() => (gameData?.metadata as any)?.phase || 'SETUP', [gameData?.metadata]);
    const board = useMemo(() => (gameData?.board as Record<string, any>) || {}, [gameData?.board]);
    const turn = gameData?.turn;
    const winner = gameData?.winner;

    const myId = user?.id || '';
    const myBoard = board[myId];
    // In a real secure app, opponent board shouldn't contain ship data unless sunk/hit. 
    // Here we trust the server sent full state but we visually hide logic.
    const opponent = players.find(p => p.id !== myId);
    const opponentBoard = opponent ? board[opponent.id] : null;

    const isMyTurn = turn === myId;
    const isSetup = phase === 'SETUP';

    // Setup State
    const [placedShips, setPlacedShips] = useState<any[]>([]);
    const [currentShipIndex, setCurrentShipIndex] = useState(0);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const shipOrder: ShipType[] = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
    const currentShipType = shipOrder[currentShipIndex];
    const isReady = myBoard?.isReady;

    // Sounds
    const playSound = useCallback((type: 'hit' | 'miss' | 'place' | 'sunk' | 'win' | 'start') => {
        const sounds = {
            hit: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3', // Explosion-ish
            miss: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3', // Splash
            place: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Mechanical click
            sunk: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3', // Big boom
            win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Victory
            start: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' // Siren
        };
        new Audio(sounds[type]).play().catch(() => {});
    }, []);

    // Win Effect
    useEffect(() => {
        if (winner) {
            playSound('win');
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        }
    }, [winner, playSound]);

    // Setup Logic
    const handleSetupClick = (r: number, c: number) => {
        if (currentShipIndex >= shipOrder.length || isReady) return;

        const size = SHIP_SIZES[currentShipType];
        const newShipCoords: {r:number, c:number}[] = [];

        // Calculate coords
        for (let i = 0; i < size; i++) {
            const nr = orientation === 'horizontal' ? r : r + i;
            const nc = orientation === 'horizontal' ? c + i : c;
            
            if (nr >= 10 || nc >= 10) return; // Out of bounds
            
            // Check collision
            const overlap = placedShips.some(s => s.coords.some((coord: any) => coord.r === nr && coord.c === nc));
            if (overlap) return;

            newShipCoords.push({ r: nr, c: nc });
        }

        playSound('place');
        const newShip = {
            id: `${currentShipType}-${Date.now()}`,
            type: currentShipType,
            size,
            hits: 0,
            coords: newShipCoords
        };

        setPlacedShips([...placedShips, newShip]);
        setCurrentShipIndex(currentShipIndex + 1);
    };

    const handleResetSetup = () => {
        setPlacedShips([]);
        setCurrentShipIndex(0);
    };

    const handleConfirmSetup = () => {
        socket?.emit('game-move', {
            roomId,
            move: {
                type: 'place_ships',
                data: { ships: placedShips }
            }
        });
    };

    // Battle Logic
    const handleAttack = (r: number, c: number) => {
        if (!isMyTurn || !!winner || opponentBoard?.grid[r][c] === 'hit' || opponentBoard?.grid[r][c] === 'miss') return;

        // Optimistic UI updates handled by effect usually, but we can play sound immediately?
        // Better wait for result or assume shoot sound.
        playSound('place'); // Actually 'shoot' sound
        socket?.emit('game-move', {
            roomId,
            move: {
                type: 'shoot',
                data: { r, c }
            }
        });
    };

    if (!gameData) return null;

    return (
        <Card className="w-full max-w-6xl mx-auto bg-slate-950 border-slate-800 shadow-[0_0_120px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col p-6 md:p-10 rounded-[3rem] border-2">
             {/* AMBIENT GLOW */}
             <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-1/4 left-1/4 w-1/2 h-1/2 bg-blue-900/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-cyan-900/10 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-white italic uppercase leading-none">Battleship <span className="text-cyan-500">Command</span></h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        PHASE: <span className={isSetup ? "text-yellow-400" : "text-red-400"}>{phase}</span>
                    </p>
                </div>
                
                {!isSetup && (
                     <div className={cn(
                        "inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                        isMyTurn ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.2)]" : "bg-white/5 text-slate-400 border border-white/10"
                    )}>
                        <Crosshair className="w-4 h-4" />
                        {isMyTurn ? "Systems Ready - Fire" : "Enemy Targeting..."}
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start justify-center relative z-10">
                
                {/* LEFT: MY FLEET */}
                <div className="flex-1 w-full max-w-[500px] flex flex-col gap-4">
                    <div className="flex items-center justify-between text-white/50 text-[10px] font-black uppercase tracking-widest px-2">
                        <span className="flex items-center gap-2"><Anchor className="w-3 h-3" /> My Fleet Status</span>
                        {isSetup && !isReady && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-6 text-[9px] border-white/10 bg-white/5" onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}>
                                    <RefreshCw className="w-3 h-3 mr-1" /> Rotate
                                </Button>
                                <Button size="sm" variant="destructive" className="h-6 text-[9px]" onClick={handleResetSetup}>
                                    Reset
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "aspect-square w-full bg-slate-900/50 rounded-xl border border-white/10 relative overflow-hidden grid grid-cols-10 grid-rows-10 gap-px p-px",
                        (isSetup && !isReady) ? "cursor-crosshair ring-2 ring-cyan-500/20" : ""
                    )}>
                        {/* Grid Cells */}
                        {Array.from({ length: 100 }).map((_, i) => {
                            const r = Math.floor(i / 10);
                            const c = i % 10;
                            // During Setup, use local state. During Battle, use Server Board.
                            const serverCell = myBoard?.grid ? myBoard.grid[r][c] : null;
                            const isLocalShip = isSetup && placedShips.some(s => s.coords.some((coord: any) => coord.r === r && coord.c === c));
                            
                            // Visuals
                            let bg = "bg-slate-900";
                            const isHit = serverCell === 'hit';
                            const isMiss = serverCell === 'miss';
                            const isShip = serverCell === 'ship' || isLocalShip;

                            if (isHit) bg = "bg-red-500/80 animate-pulse";
                            else if (isMiss) bg = "bg-white/10";
                            else if (isShip) bg = "bg-cyan-600/60 border border-cyan-400/30";

                            // Setup Preview Hover
                            // (Complex to add hover preview in React efficiently without perf hit, skipping for MVP)

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => (isSetup && !isReady) && handleSetupClick(r, c)}
                                    className={cn("w-full h-full transition-colors flex items-center justify-center", bg)}
                                >
                                    {isHit && <div className="w-2 h-2 rounded-full bg-red-950 animate-ping" />}
                                    {isMiss && <div className="w-1 h-1 rounded-full bg-white/30" />}
                                </div>
                            );
                        })}
                    </div>

                    {isSetup && !isReady && (
                        <div className="flex flex-col gap-2 p-4 bg-cyan-950/30 border border-cyan-500/20 rounded-xl">
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <Play className="w-3 h-3" /> Deploying: {currentShipType?.toUpperCase()} ({SHIP_SIZES[currentShipType]})
                            </p>
                            <p className="text-white/30 text-[10px]">Tap grid to place. Use Rotate to change orientation.</p>
                            
                            {placedShips.length === 5 && (
                                <Button onClick={handleConfirmSetup} className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest mt-2">
                                    Confirm Deployment
                                </Button>
                            )}
                        </div>
                    )}
                    {isReady && isSetup && (
                         <div className="flex items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl animate-pulse">
                            <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">Fleet Awaiting Orders...</p>
                         </div>
                    )}
                </div>

                {/* RIGHT: RADAR */}
                {!isSetup && (
                    <div className="flex-1 w-full max-w-[500px] flex flex-col gap-4">
                        <div className="flex items-center justify-between text-white/50 text-[10px] font-black uppercase tracking-widest px-2">
                             <span className="flex items-center gap-2"><Crosshair className="w-3 h-3" /> Tactical Radar</span>
                             <span className="text-red-400/50">Target Enemy Grid</span>
                        </div>

                        <div className="aspect-square w-full bg-emerald-950/10 rounded-xl border border-emerald-500/20 relative overflow-hidden grid grid-cols-10 grid-rows-10 gap-px p-px">
                            {/* Radar Grid Cells */}
                            {Array.from({ length: 100 }).map((_, i) => {
                                const r = Math.floor(i / 10);
                                const c = i % 10;
                                const cell = opponentBoard?.grid ? opponentBoard.grid[r][c] : 'empty';
                                
                                const isHit = cell === 'hit';
                                const isMiss = cell === 'miss';
                                const canShoot = cell !== 'hit' && cell !== 'miss' && !winner && isMyTurn;

                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => canShoot && handleAttack(r, c)}
                                        className={cn(
                                            "w-full h-full transition-all flex items-center justify-center",
                                            "bg-[#0a0f0a]", // Dark radar bg
                                            canShoot && "hover:bg-emerald-500/20 cursor-crosshair active:scale-95",
                                            isHit && "bg-red-500/20 ring-1 ring-red-500/50",
                                            isMiss && "bg-white/5"
                                        )}
                                    >
                                        {isHit && <Swords className="w-3 h-3 text-red-500 animate-pulse" />}
                                        {isMiss && <div className="w-1 h-1 rounded-full bg-white/20" />}
                                    </div>
                                );
                            })}
                            
                            {/* Scanning Animation line */}
                            <div className="absolute inset-x-0 h-1 bg-emerald-500/30 blur-[2px] animate-scan pointer-events-none top-0" />
                        </div>
                    </div>
                )}
            </div>

            <GameResultOverlay 
                winnerId={winner || null}
                players={players}
                localUserId={user?.id || ''}
                isHost={isHost}
                onRematch={() => socket?.emit('start-game', { roomId, type: 'battleship', players: players.map(p => p.id) })}
                onEndGame={() => endGame()}
                gameType="battleship"
            />
        </Card>
    );
};
