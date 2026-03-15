/**
 * Carrom Game React Component
 *
 * Canvas-based game renderer with touch/mouse input handling.
 * Displays real-time game state and provides visual feedback.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Target, RotateCcw } from 'lucide-react';
import { CarromGameState, PlayerInput, PlayerId, PhysicsBody } from '../types/game-state';
import { vec2FromFixed, toFixed, fromFixed } from '../fixed-point';

interface CarromGameProps {
  gameEngine: CarromGameEngine;
  currentPlayerId: PlayerId;
  onInput: (input: PlayerInput) => void;
  width?: number;
  height?: number;
}

/** Canvas rendering constants */
const CANVAS_SIZE = 740;
const BOARD_WOOD_BASE = '#8b4513';
const BOARD_WOOD_LIGHT = '#d2b48c';
const BOARD_WOOD_DARK = '#5c2e0a';
const COIN_COLORS = {
  white: { base: '#fef3c7', shine: '#ffffff', stroke: '#92400e' },
  black: { base: '#1f2937', shine: '#4b5563', stroke: '#000000' },
  queen: { base: '#dc2626', shine: '#f87171', stroke: '#7f1d1d' },
  striker: { base: '#ffffff', shine: '#ef4444', stroke: '#374151' },
} as const;
const POCKET_COLOR = '#111827';
const DRAG_LINE_COLOR = '#fbbf24';

export const CarromGame: React.FC<CarromGameProps> = ({
  gameEngine,
  currentPlayerId,
  onInput,
  width = CANVAS_SIZE,
  height = CANVAS_SIZE,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<CarromGameState>(gameEngine.getGameState());
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const gameLoop = (currentTime: number) => {
      gameEngine.update(currentTime / 1000); // Pass delta in seconds if needed, or total time
      setGameState(gameEngine.getGameState());
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameEngine]);

  const drawAll = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    
    // 1. Draw Board Frame
    drawBoardFrame(ctx, width, height);
    
    // 2. Draw Board surface
    drawBoardSurface(ctx, gameState);
    
    // 3. Draw Board Patterns
    drawBoardPatterns(ctx, gameState);
    
    // 4. Draw Pockets
    drawPockets(ctx, gameState);
    
    // 5. Draw Coins
    gameState.physics.coins.forEach(coin => {
      if (!coin.pocketed) drawCoin(ctx, coin);
    });
    
    // 6. Draw Striker
    const striker = gameState.physics.striker;
    if (!striker.pocketed) drawCoin(ctx, striker);
    
    // 7. Draw Drag UI
    if (dragState.isDragging) {
      drawDragUI(ctx, dragState);
    }
  }, [gameState, dragState, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawAll(ctx);
  }, [drawAll]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState.phase !== 'playing' || gameState.currentPlayer !== currentPlayerId) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const striker = gameState.physics.striker;
    const strikerPos = canvasToBoard(x, y, gameState, width, height); // Simplified for now
    
    // Check if clicking near striker
    const sPos = vec2FromFixed(striker.position);
    const dist = Math.hypot(sPos.x - strikerPos.x, sPos.y - strikerPos.y);
    
    if (dist < fromFixed(striker.radius) * 2) {
      setDragState({ isDragging: true, startX: x, startY: y, currentX: x, currentY: y });
      onInput({
        playerId: currentPlayerId,
        type: 'drag_start',
        startPosition: { x: toFixed(strikerPos.x), y: toFixed(strikerPos.y) },
        timestamp: Date.now(),
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDragState(prev => ({
      ...prev,
      currentX: e.clientX - rect.left,
      currentY: e.clientY - rect.top
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const startBoard = canvasToBoard(dragState.startX, dragState.startY, gameState, width, height);
    const endBoard = canvasToBoard(x, y, gameState, width, height);
    
    onInput({
      playerId: currentPlayerId,
      type: 'drag_end',
      startPosition: { x: toFixed(startBoard.x), y: toFixed(startBoard.y) },
      currentPosition: { x: toFixed(endBoard.x), y: toFixed(endBoard.y) },
      timestamp: Date.now(),
    });
    
    setDragState(prev => ({ ...prev, isDragging: false }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f16] text-white p-4 font-sans select-none">
      {/* Header Info */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${gameState.currentPlayer === gameState.players[0].id ? 'bg-amber-500/20 border-amber-500/50' : 'bg-white/5'} border transition-all`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Player 1</p>
            <p className="text-xl font-black italic">{gameState.players[0].id.slice(0, 8)}</p>
            <p className="text-2xl font-black text-amber-500">{gameState.players[0].score}</p>
          </div>
          <Zap className="text-white/20" size={24} />
          <div className={`p-3 rounded-xl ${gameState.currentPlayer === gameState.players[1].id ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5'} border transition-all`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Player 2</p>
            <p className="text-xl font-black italic">{gameState.players[1].id.slice(0, 8)}</p>
            <p className="text-2xl font-black text-indigo-500">{gameState.players[1].score}</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-amber-500" size={18} />
            <span className="text-2xl font-mono font-black">{Math.ceil(gameState.timeRemaining)}s</span>
          </div>
          <div className="px-4 py-1 bg-white/10 rounded-full border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              {gameState.phase.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="relative group">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border-[12px] border-zinc-900"
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="cursor-crosshair w-full h-full max-w-[85vh] aspect-square"
          />
        </motion.div>

        {/* Turn Indicator Overlay */}
        <AnimatePresence>
          {gameState.currentPlayer === currentPlayerId && gameState.phase === 'playing' && !dragState.isDragging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-2 rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-2xl z-20"
            >
              YOUR TURN
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="mt-8 flex gap-6">
        <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all group">
          <RotateCcw className="group-hover:rotate-180 transition-transform duration-500" size={18} />
          <span className="text-xs font-black uppercase tracking-widest">Reset</span>
        </button>
        <button className="flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-xl hover:bg-indigo-400 transition-all">
          <Target size={18} /> Practice Mode
        </button>
      </div>
    </div>
  );
};

// --- DRAWING HELPERS ---

function drawBoardFrame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
  gradient.addColorStop(0, BOARD_WOOD_LIGHT);
  gradient.addColorStop(0.7, BOARD_WOOD_BASE);
  gradient.addColorStop(1, BOARD_WOOD_DARK);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawBoardSurface(ctx: CanvasRenderingContext2D, state: CarromGameState) {
  const { width, height } = state.board;
  const w = fromFixed(width);
  const h = fromFixed(height);
  
  // Outer border lines
  ctx.strokeStyle = '#3d2b1f';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, w - 60, h - 60);
}

function drawBoardPatterns(ctx: CanvasRenderingContext2D, state: CarromGameState) {
  const w = fromFixed(state.board.width);
  const h = fromFixed(state.board.height);
  const cx = w / 2;
  const cy = h / 2;

  ctx.strokeStyle = '#3d2b1f';
  ctx.lineWidth = 1.5;

  // Center Circle
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Baselines
  const baselineOffset = 110;
  const baselineThickness = 32;
  
  // Bottom Baseline
  ctx.strokeRect(baselineOffset, h - 110, w - baselineOffset * 2, baselineThickness);
  // Top Baseline
  ctx.strokeRect(baselineOffset, 110 - baselineThickness, w - baselineOffset * 2, baselineThickness);
  // Left
  ctx.strokeRect(110 - baselineThickness, baselineOffset, baselineThickness, h - baselineOffset * 2);
  // Right
  ctx.strokeRect(w - 110, baselineOffset, baselineThickness, h - baselineOffset * 2);

  // Red circles at ends of baselines
  const endCircleRadius = 15;
  ctx.fillStyle = '#dc262622';
  [
    [baselineOffset, h - 110 + 16], [w - baselineOffset, h - 110 + 16],
    [baselineOffset, 110 - 16], [w - baselineOffset, 110 - 16]
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, endCircleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawPockets(ctx: CanvasRenderingContext2D, state: CarromGameState) {
  state.board.pockets.forEach(p => {
    const pos = vec2FromFixed(p.position);
    const rad = fromFixed(p.radius);

    // Deep shadow for pocket
    const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, rad);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.8, POCKET_COLOR);
    grad.addColorStop(1, '#1f2937');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer glow/ring
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  });
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: PhysicsBody) {
  const pos = vec2FromFixed(coin.position);
  const rad = fromFixed(coin.radius);
  const colors = COIN_COLORS[coin.type as keyof typeof COIN_COLORS] || COIN_COLORS.white;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  // Base
  const grad = ctx.createRadialGradient(pos.x - rad/3, pos.y - rad/3, rad/10, pos.x, pos.y, rad);
  grad.addColorStop(0, colors.shine);
  grad.addColorStop(0.4, colors.base);
  grad.addColorStop(1, colors.stroke);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
  ctx.fill();
  
  // Border
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Decorative inner ring
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, rad * 0.7, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDragUI(ctx: CanvasRenderingContext2D, drag: { startX: number; startY: number; currentX: number; currentY: number }) {
  // Arrow from start to current
  const dx = drag.currentX - drag.startX;
  const dy = drag.currentY - drag.startY;
  const dist = Math.hypot(dx, dy);
  
  ctx.setLineDash([8, 12]);
  ctx.strokeStyle = DRAG_LINE_COLOR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(drag.startX, drag.startY);
  ctx.lineTo(drag.currentX, drag.currentY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Power indicator
  ctx.fillStyle = DRAG_LINE_COLOR + '44';
  ctx.beginPath();
  ctx.arc(drag.startX, drag.startY, dist, 0, Math.PI * 2);
  ctx.fill();
}

function canvasToBoard(cx: number, cy: number, _state: CarromGameState, _cw: number, _ch: number) {
  // Assuming 1:1 scale for now as CANVAS_SIZE matches BOARD_SIZE
  return { x: cx, y: cy };
}