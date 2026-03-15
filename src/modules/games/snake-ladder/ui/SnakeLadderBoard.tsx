import React, { useRef, useEffect, useMemo } from 'react';
import { GameState, PlayerState } from '../types';

interface SnakeLadderBoardProps {
  gameState: GameState;
  onRoll: () => void;
}

export const SnakeLadderBoard: React.FC<SnakeLadderBoardProps> = ({ gameState, onRoll }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const boardConfig = useMemo(() => gameState.boardConfig, [gameState.boardConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render static board
    renderStaticBoard(ctx, boardConfig);

    // Render dynamic tokens
    renderTokens(ctx, gameState.players);
  }, [gameState.players, boardConfig]);

  const renderStaticBoard = (ctx: CanvasRenderingContext2D, config: any) => {
    // Draw grid, snakes, ladders
    // Boustrophedon layout
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const cell = row % 2 === 0 ? row * 10 + col + 1 : row * 10 + (9 - col) + 1;
        // Draw cell
      }
    }
    // Draw snakes and ladders
  };

  const renderTokens = (ctx: CanvasRenderingContext2D, players: PlayerState[]) => {
    players.forEach((player) => {
      if (player.position > 0) {
        const { x, y } = positionToCoords(player.position);
        ctx.fillStyle = player.tokenColor;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const positionToCoords = (pos: number): { x: number; y: number } => {
    // Calculate x,y for boustrophedon
    const row = Math.floor((pos - 1) / 10);
    const col = (pos - 1) % 10;
    const x = row % 2 === 0 ? col * 50 : (9 - col) * 50;
    const y = (9 - row) * 50;
    return { x: x + 25, y: y + 25 };
  };

  return (
    <div>
      <canvas ref={canvasRef} width={500} height={500} />
      <button onClick={onRoll}>Roll Dice</button>
    </div>
  );
};
