import { useEffect, useState, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { UnoEngine, UnoGameState, UnoCard } from '@/game-engine/engines/UnoEngine';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { GameResultOverlay } from './ui/GameResultOverlay';

export const UnoGame = () => {
    const { gameState, socket, roomId, endGame, isHost } = useWebSocket();
    const { user } = useAuth();
    
    // Engine not strictly needed client side for logic if server handles it, 
    // but useful for optimistic UI or local validation.
    // We rely on 'gameState' from props which comes from socket.
    
    const gameData = useMemo(() => (gameState && gameState.type === 'uno' ? gameState as UnoGameState : null), [gameState]);
    const players = useMemo(() => gameData?.players || [], [gameData?.players]);
    const myHand = useMemo(() => gameData?.hands[user?.id || ''] || [], [gameData, user]);
    const topCard = useMemo(() => gameData?.discardPile[gameData.discardPile.length - 1], [gameData]);
    const currentColor = gameData?.currentColor;
    const isMyTurn = gameData?.currentTurn === user?.id;

    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);

    const handleAction = (type: 'play' | 'draw', card?: UnoCard, pickedColor?: string) => {
        if (!isMyTurn || !roomId) return;

        if (type === 'draw') {
            socket?.emit('make-game-move', { roomId, move: { type: 'draw' } });
            return;
        }

        if (type === 'play' && card) {
            // Check wild
            if (card.color === 'wild' && !pickedColor) {
                setPendingWildCard(card);
                setShowColorPicker(true);
                return;
            }

            socket?.emit('make-game-move', { 
                roomId, 
                move: { 
                    type: 'play', 
                    data: { card, pickedColor } 
                } 
            });
            setShowColorPicker(false);
            setPendingWildCard(null);
        }
    };

    if (!gameData) return null;

    return (
        <Card className="w-full max-w-6xl mx-auto bg-[#1a0b2e] border-purple-900/50 shadow-[0_0_100px_rgba(100,0,255,0.2)] relative overflow-hidden flex flex-col p-4 min-h-[600px] rounded-[3rem]">
            {/* TABLE TEXTURE */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2d1b4e_0%,_#1a0b2e_100%)]" />

            {/* OPPONENTS (Top) */}
            <div className="relative z-10 flex justify-center gap-8 pt-4">
                {players.filter(p => p.id !== user?.id).map((p, i) => {
                    const cardCount = gameData.hands[p.id]?.length || 0;
                    const isTurn = gameData.currentTurn === p.id;
                    return (
                        <div key={p.id} className={cn("flex flex-col items-center gap-2 transition-all", isTurn ? "scale-110" : "opacity-70")}>
                            <div className={cn("w-16 h-16 rounded-full border-4 overflow-hidden relative shadow-xl", isTurn ? "border-yellow-400" : "border-white/10")}>
                                <img src={p.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`} alt={p.name} className="w-full h-full object-cover" />
                                {cardCount <= 2 && <div className="absolute inset-0 bg-red-500/50 animate-pulse" />}
                            </div>
                            <div className="bg-black/50 px-3 py-1 rounded-full text-xs font-bold text-white relative">
                                {p.name}
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-[10px] border-2 border-[#1a0b2e]">
                                    {cardCount}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CENTER (Deck & Discard) */}
            <div className="flex-1 flex items-center justify-center gap-12 relative z-10 my-8">
                 {/* DRAW DECK */}
                 <motion.button
                     whileHover={{ scale: 1.05, y: -5 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => handleAction('draw')}
                     disabled={!isMyTurn}
                     className={cn("w-32 h-48 bg-slate-900 rounded-2xl border-4 border-slate-700 shadow-2xl relative group", !isMyTurn && "opacity-50 cursor-not-allowed")}
                 >
                     <div className="absolute inset-2 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center">
                         <span className="font-black text-slate-600 text-4xl rotate-45">UNO</span>
                     </div>
                     {isMyTurn && <div className="absolute -top-12 left-0 right-0 text-center text-white font-bold animate-bounce">DRAW</div>}
                 </motion.button>

                 {/* DISCARD PILE */}
                 <div className="relative w-32 h-48">
                     <UnoCardView card={topCard!} />
                     {/* Color Indicator for Wilds */}
                     {topCard?.color === 'wild' && (
                         <div className={cn("absolute -bottom-8 left-0 right-0 h-4 rounded-full shadow-[0_0_20px_CURRENTCOLOR]", 
                            currentColor === 'red' ? 'bg-red-500 shadow-red-500' :
                            currentColor === 'blue' ? 'bg-blue-500 shadow-blue-500' :
                            currentColor === 'green' ? 'bg-green-500 shadow-green-500' : 'bg-yellow-400 shadow-yellow-400'
                         )} />
                     )}
                 </div>
            </div>

            {/* MY HAND (Bottom) */}
            <div className="relative z-10 pt-10 pb-4">
                <div className="flex justify-center items-end -space-x-8 hover:space-x-2 transition-all duration-300 min-h-[200px] overflow-x-auto px-10 py-4 no-scrollbar">
                    {myHand.map((card, i) => (
                        <motion.div
                            key={card.id}
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1, rotate: (i - myHand.length/2) * 5 }}
                            whileHover={{ y: -40, rotate: 0, scale: 1.2, zIndex: 50 }}
                            transition={{ type: 'spring' }}
                            onClick={() => handleAction('play', card)}
                            className={cn("cursor-pointer relative", !isMyTurn && "opacity-70 pointer-events-none")}
                        >
                            <UnoCardView card={card} />
                        </motion.div>
                    ))}
                </div>
                {isMyTurn && <p className="text-center text-white font-black animate-pulse mt-2">YOUR TURN</p>}
            </div>

            {/* COLOR PICKER MODAL */}
            <AnimatePresence>
                {showColorPicker && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm"
                    >
                        <div className="grid grid-cols-2 gap-4 p-8">
                            {['red', 'blue', 'green', 'yellow'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => handleAction('play', pendingWildCard!, c)}
                                    className={cn("w-32 h-32 rounded-3xl shadow-2xl hover:scale-110 transition-all", 
                                        c === 'red' ? 'bg-red-500' : c === 'blue' ? 'bg-blue-500' : c === 'green' ? 'bg-green-500' : 'bg-yellow-400'
                                    )}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <GameResultOverlay 
                winnerId={gameData.winner}
                players={players}
                localUserId={user?.id || ''}
                isHost={isHost}
                onRematch={() => socket?.emit('start-game', { roomId, type: 'uno', players: players.map(p => p.id) })}
                onEndGame={() => endGame()}
                gameType="uno"
            />
        </Card>
    );
};

const UnoCardView = ({ card }: { card: UnoCard }) => {
    if (!card) return <div className="w-32 h-48 bg-slate-800 rounded-2xl border-4 border-slate-700" />;

    const colors = {
        red: 'bg-red-600 border-red-400',
        blue: 'bg-blue-600 border-blue-400',
        green: 'bg-green-600 border-green-400',
        yellow: 'bg-yellow-400 border-yellow-200',
        wild: 'bg-black border-slate-400'
    };

    return (
        <div className={cn("w-32 h-48 rounded-2xl border-4 shadow-xl flex items-center justify-center relative overflow-hidden", colors[card.color])}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="w-24 h-36 border-2 border-white/30 rounded-[3rem] flex items-center justify-center -rotate-12 bg-black/10">
                <span className={cn("font-black text-5xl text-white drop-shadow-md", card.value.length > 2 && "text-2xl")}>
                    {card.value === 'skip' ? '🚫' : 
                     card.value === 'reverse' ? '🔁' : 
                     card.value === 'draw2' ? '+2' : 
                     card.value === 'draw4' ? '+4' : 
                     card.value === 'wild' ? '🌈' : card.value}
                </span>
            </div>
            <span className="absolute top-2 left-3 font-bold text-white/80">{card.value}</span>
            <span className="absolute bottom-2 right-3 font-bold text-white/80 rotate-180">{card.value}</span>
        </div>
    );
};
