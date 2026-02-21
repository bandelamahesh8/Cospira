import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHESS_CONFIG } from '@/lib/chess/config';
import { Crown, Shield, Zap } from 'lucide-react';

const PIECE_ICONS = [
  { Icon: Shield, name: 'Pawn' },
  { Icon: Zap, name: 'Knight' },
  { Icon: Crown, name: 'Queen' },
];

export const WaitingState = () => {
  const [currentPieceIndex, setCurrentPieceIndex] = useState(0);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [glowingSquares, setGlowingSquares] = useState<number[]>([]);

  // Cycle through chess pieces
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPieceIndex((prev) => (prev + 1) % PIECE_ICONS.length);
    }, CHESS_CONFIG.ANIMATIONS.WAITING_PIECE_CYCLE);

    return () => clearInterval(interval);
  }, []);

  // Rotate status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex(
        (prev) => (prev + 1) % CHESS_CONFIG.WAITING_MESSAGES.length
      );
    }, CHESS_CONFIG.ANIMATIONS.STATUS_TEXT_ROTATION);

    return () => clearInterval(interval);
  }, []);

  // Animate glowing center squares
  useEffect(() => {
    const centerSquares = [27, 28, 35, 36]; // e4, d4, e5, d5
    let currentIndex = 0;

    const interval = setInterval(() => {
      setGlowingSquares([centerSquares[currentIndex]]);
      currentIndex = (currentIndex + 1) % centerSquares.length;
    }, 800);

    return () => clearInterval(interval);
  }, []);

  const { Icon, name } = PIECE_ICONS[currentPieceIndex];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-sm">
      {/* Animated Chess Piece */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPieceIndex}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Icon className="w-20 h-20 text-blue-400" strokeWidth={1.5} />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Status Text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentMessageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-lg font-medium text-slate-300 mb-2"
        >
          {CHESS_CONFIG.WAITING_MESSAGES[currentMessageIndex]}
        </motion.p>
      </AnimatePresence>

      {/* Subtle loading dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="w-2 h-2 rounded-full bg-blue-400"
          />
        ))}
      </div>

      {/* Glowing Board Squares (Background) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full max-w-md mx-auto">
          {Array.from({ length: 64 }).map((_, index) => (
            <div
              key={index}
              className={`border border-slate-700/30 transition-all duration-500 ${
                glowingSquares.includes(index)
                  ? 'bg-blue-500/40 shadow-lg shadow-blue-500/50'
                  : 'bg-transparent'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
