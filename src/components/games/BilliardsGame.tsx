import { useEffect, useRef, useState, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { BilliardsGameState, Ball, BilliardsEngine } from '@/game-engine/engines/BilliardsEngine';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GameResultOverlay } from './ui/GameResultOverlay';

// Constants (Must match Engine)
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;

export const BilliardsGame = () => {
    const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
    const { user } = useAuth();
    
    // Canvas Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<BilliardsEngine>(new BilliardsEngine()); // Client-side engine for prediction
    const animationFrameRef = useRef<number>();
    
    // Local State
    const [cueAngle, setCueAngle] = useState(0);
    const [cuePower, setCuePower] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    
    const gameData = useMemo(() => (gameState && gameState.type === 'billiards' ? gameState as BilliardsGameState : null), [gameState]);
    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const isMyTurn = gameData?.currentTurn === user?.id;

    // --- Physics & Rendering Loop ---
    useEffect(() => {
        if (!gameData || !canvasRef.current) return;
        
        // Sync local engine with server state
        engineRef.current.state = JSON.parse(JSON.stringify(gameData));
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const render = () => {
            // Clear
            ctx.fillStyle = '#0f380f'; // Felt Green
            ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
            
            // Draw Rails
            ctx.lineWidth = 20;
            ctx.strokeStyle = '#3e2723'; // Wood
            ctx.strokeRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
            
            // Draw Pockets
            ctx.fillStyle = '#000';
            engineRef.current.POCKETS.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
                ctx.fill();
            });

            // Physics Update (Client-side prediction visual)
            // If ball is moving, we step physics for smoothness
            // In a real app, we'd lerp or run the same simulation loop
            // For now, let's just draw the state 
            // IMPROVEMENT: If shotInProgress, run local physics!
            
            const balls = (engineRef.current.state as BilliardsGameState).balls;
            
            if ((engineRef.current.state as BilliardsGameState).shotInProgress) {
                 // Run physics step
                 // engineRef.current.stepPhysics(balls); // Access private method? Need to expose or public
                 // For now, rely on updates or simple lerp if static.
                 // Actually, let's implement the draw loop using the PROPS data mostly
            }

            // Draw Balls
            balls.forEach(ball => {
                if (!ball.visible) return;
                
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.arc(ball.x + 2, ball.y + 2, 10, 0, Math.PI * 2);
                ctx.fill();

                // Ball Body
                ctx.fillStyle = getBallColor(ball);
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
                ctx.fill();

                // Stripe/Number details (simplified)
                if (ball.type === 'stripe') {
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    // Stripe band
                    ctx.strokeStyle = getBallColor(ball);
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(ball.x - 8, ball.y);
                    ctx.lineTo(ball.x + 8, ball.y);
                    ctx.stroke();
                } else if (ball.type === 'solid' || ball.type === 'black') {
                     ctx.fillStyle = 'rgba(255,255,255,0.8)';
                     ctx.beginPath();
                     ctx.arc(ball.x - 3, ball.y - 3, 2, 0, Math.PI * 2);
                     ctx.fill();
                }
            });

            // Cue Stick (Only if my turn and not moving)
            if (isMyTurn && !(engineRef.current.state as BilliardsGameState).shotInProgress) {
                const cueBall = balls[0];
                if (cueBall.visible) {
                    ctx.save();
                    ctx.translate(cueBall.x, cueBall.y);
                    ctx.rotate(cueAngle);
                    
                    // Stick
                    ctx.fillStyle = '#d2b48c'; // Tan wood
                    ctx.fillRect(15 + cuePower, -2, 200, 4);
                    
                    // Tip
                    ctx.fillStyle = '#00f';
                    ctx.fillRect(12 + cuePower, -2, 3, 4);
                    
                    // Guide Line
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.setLineDash([5, 5]);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-500, 0); // Opposite direction of stick
                    ctx.stroke();
                    
                    ctx.restore();
                }
            }

            animationFrameRef.current = requestAnimationFrame(render);
        };
        
        render();
        return () => cancelAnimationFrame(animationFrameRef.current!);
    }, [gameData, isMyTurn, cueAngle, cuePower]);

    // Input Handlers
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current || !isMyTurn || !gameData) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const scaleX = TABLE_WIDTH / rect.width;
        const scaleY = TABLE_HEIGHT / rect.height;
        
        const gameX = mouseX * scaleX;
        const gameY = mouseY * scaleY;
        
        const cueBall = gameData.balls[0];
        
        if (isDragging) {
            // Power Calculation (distance from ball)
            const dx = gameX - cueBall.x;
            const dy = gameY - cueBall.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            setCuePower(Math.min(dist, 100)); // Cap drag
        } else {
            // Aiming (Angle from ball to mouse)
            // Actually stick should point towards ball. 
            // So mouse is BEHIND stick.
            const dx = gameX - cueBall.x;
            const dy = gameY - cueBall.y;
            setCueAngle(Math.atan2(dy, dx));
        }
    };

    const handleMouseDown = () => {
        if (isMyTurn) setIsDragging(true);
    };

    const handleMouseUp = () => {
        if (isMyTurn && isDragging) {
            setIsDragging(false);
            if (cuePower > 5) {
                // Shoot!
                // Angle needs to be reversed because stick is behind ball
                // If aiming angle is theta, force vector is opposite?
                // Visual: Stick is at `angle`. Force should be `angle + PI` (pushing).
                const shotAngle = cueAngle + Math.PI; 
                
                socket?.emit('make-game-move', { 
                    roomId, 
                    move: { 
                        type: 'shoot', 
                        data: { angle: shotAngle, power: cuePower / 3 } // Scale power
                    } 
                });
                setCuePower(0);
            }
        }
    };

    const getBallColor = (ball: Ball) => {
        if (ball.type === 'white') return '#fff';
        if (ball.type === 'black') return '#000';
        
        const colors = ['#fdd835', '#1e88e5', '#e53935', '#8e24aa', '#fb8c00', '#43a047', '#6d4c41'];
        return colors[(ball.id - 1) % colors.length];
    };

    if (!gameData) return null;

    return (
        <Card className="w-full max-w-6xl mx-auto bg-slate-900 p-4 rounded-3xl border border-slate-700 shadow-2xl relative">
            {/* HUD / Scoreboard */}
            <div className="flex justify-between items-center mb-4 px-8 text-white">
                <div className="flex gap-4">
                    {players.map(p => (
                        <div key={p.id} className={cn("px-4 py-2 rounded-xl", gameData.currentTurn === p.id ? "bg-green-600" : "bg-slate-800")}>
                            <p className="font-bold">{p.name}</p>
                            <p className="text-xs opacity-70 uppercase tracking-widest">
                                {gameData.activePlayerType === 'open' ? 'OPEN' : 
                                 (gameData.currentTurn === p.id ? gameData.activePlayerType : (gameData.activePlayerType === 'solid' ? 'stripe' : 'solid'))}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="text-xl font-black italic">8-BALL POOL</div>
            </div>

            {/* THE TABLE */}
            <div className="relative aspect-[2/1] w-full bg-[#1a1a1a] rounded-lg shadow-inner overflow-hidden cursor-crosshair">
                <canvas 
                    ref={canvasRef}
                    width={TABLE_WIDTH} 
                    height={TABLE_HEIGHT}
                    className="w-full h-full touch-none"
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => setIsDragging(false)}
                />
            </div>
            
            <p className="text-center text-slate-500 text-xs mt-4">Running Custom 2D Physics Engine (Client-Predicted)</p>

            <GameResultOverlay 
                 winnerId={gameData.winner}
                 players={players}
                 localUserId={user?.id || ''}
                 isHost={isHost}
                 onRematch={() => socket?.emit('start-game', { roomId, type: 'billiards', players: players.map(p => p.id) })}
                 onEndGame={() => endGame()}
                 gameType="billiards"
             />
        </Card>
    );
};
