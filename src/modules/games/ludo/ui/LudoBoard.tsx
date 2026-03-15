/**
 * LudoBoard.tsx
 * Precision alignment fix for high-fidelity Cospira Arena
 */

import React from 'react';
import { GameState } from '@/types/websocket';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenController } from '../TokenController';

interface LudoBoardProps {
  gameState: GameState;
  onAction?: (action: any) => void;
  localUserId: string;
}

const BOARD_UNITS = 15;
const BOARD_SIZE = 1200;
const UNIT = BOARD_SIZE / BOARD_UNITS;

const COLORS = {
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
};

export const LudoBoard: React.FC<LudoBoardProps> = ({ gameState, onAction, localUserId }) => {
  const { players, tokens, currentTurn, diceRolled, diceValue } = gameState;

  const renderGrid = () => {
    const cells = [];
    for (let row = 6; row < 9; row++)
      for (let col = 0; col < 15; col++) {
        if (col < 6 || col > 8)
          cells.push(<Cell key={`c-${row}-${col}`} r={row} c={col} type={getCellType(row, col)} />);
        else if (row !== 7 || col === 7)
          cells.push(<Cell key={`c-${row}-${col}`} r={row} c={col} type={getCellType(row, col)} />);
      }
    for (let col = 6; col < 9; col++)
      for (let row = 0; row < 15; row++) {
        if (row < 6 || row > 8)
          cells.push(<Cell key={`c-${row}-${col}`} r={row} c={col} type={getCellType(row, col)} />);
      }
    return cells;
  };

  return (
    <div className='w-full h-full flex items-center justify-center'>
      <div className='relative w-full max-w-[92vh] aspect-square bg-[#0a0f1e] rounded-[3rem] p-6 shadow-2xl overflow-hidden group'>
        <div className='absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none z-10' />

        {/* Alignment Container - MUST be perfectly 1:1 with SVG */}
        <div className='relative w-full h-full bg-white rounded-[1.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]'>
          <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className='w-full h-full block'>
            <rect width={BOARD_SIZE} height={BOARD_SIZE} fill='#ffffff' />

            <House x={0} y={0} color='red' />
            <House x={9} y={0} color='green' />
            <House x={0} y={9} color='blue' />
            <House x={9} y={9} color='yellow' />

            {renderGrid()}

            <path
              d={`M${6 * UNIT},${6 * UNIT} L${7.5 * UNIT},${7.5 * UNIT} L${9 * UNIT},${6 * UNIT} Z`}
              fill={COLORS.green}
              stroke='#fff'
              strokeWidth='4'
            />
            <path
              d={`M${9 * UNIT},${6 * UNIT} L${7.5 * UNIT},${7.5 * UNIT} L${9 * UNIT},${9 * UNIT} Z`}
              fill={COLORS.yellow}
              stroke='#fff'
              strokeWidth='4'
            />
            <path
              d={`M${9 * UNIT},${9 * UNIT} L${7.5 * UNIT},${7.5 * UNIT} L${6 * UNIT},${9 * UNIT} Z`}
              fill={COLORS.blue}
              stroke='#fff'
              strokeWidth='4'
            />
            <path
              d={`M${6 * UNIT},${9 * UNIT} L${7.5 * UNIT},${7.5 * UNIT} L${6 * UNIT},${6 * UNIT} Z`}
              fill={COLORS.red}
              stroke='#fff'
              strokeWidth='4'
            />
          </svg>

          {/* Pawns Layer - Using Framer Motion x/y for absolute centering */}
          <div className='absolute inset-0 z-50 pointer-events-none'>
            <AnimatePresence>
              {players.map((p) =>
                tokens?.[p.color!]?.map((pos, idx) => {
                  const canMove =
                    diceRolled &&
                    currentTurn === localUserId &&
                    p.id === localUserId &&
                    TokenController.calculateNextPosition(pos, diceValue || 0) !== pos;

                  return (
                    <Pawn
                      key={`${p.id}-${idx}`}
                      color={COLORS[p.color as keyof typeof COLORS]}
                      playerColorName={p.color!}
                      position={pos}
                      pawnIdx={idx}
                      canMove={canMove}
                      onClick={() => {
                        if (canMove) {
                          const nextPos = TokenController.calculateNextPosition(pos, diceValue!);
                          onAction?.({
                            type: 'MOVE_TOKEN',
                            playerId: localUserId,
                            tokenId: idx,
                            fromCell: pos,
                            toCell: nextPos,
                          });
                        }
                      }}
                    />
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const getCellType = (r: number, c: number): string => {
  if (r === 7 && c > 0 && c < 6) return 'red-home';
  if (c === 7 && r > 0 && r < 6) return 'green-home';
  if (r === 7 && c > 8 && c < 14) return 'yellow-home';
  if (c === 7 && r > 8 && r < 14) return 'blue-home';
  if (r === 6 && c === 1) return 'red-start';
  if (r === 1 && c === 8) return 'green-start';
  if (r === 8 && c === 13) return 'yellow-start';
  if (r === 13 && c === 6) return 'blue-start';

  const starCells = [
    { r: 8, c: 2 },
    { r: 2, c: 6 },
    { r: 6, c: 12 },
    { r: 12, c: 8 }, // Standard Stars
    { r: 6, c: 2 },
    { r: 2, c: 8 },
    { r: 8, c: 12 },
    { r: 12, c: 6 }, // Start Cells as safe spots (Audit A3)
  ];
  if (starCells.some((s) => s.r === r && s.c === c)) return 'star';
  return 'normal';
};

const Cell = ({ r, c, type }: { r: number; c: number; type: string }) => {
  const fillMap: Record<string, string> = {
    normal: '#ffffff',
    'red-home': COLORS.red,
    'green-home': COLORS.green,
    'yellow-home': COLORS.yellow,
    'blue-home': COLORS.blue,
    'red-start': COLORS.red,
    'green-start': COLORS.green,
    'yellow-start': COLORS.yellow,
    'blue-start': COLORS.blue,
    star: '#f8fafc',
  };
  const opacity = type.endsWith('-home') ? 0.35 : 1;
  return (
    <g transform={`translate(${c * UNIT}, ${r * UNIT})`}>
      <rect
        width={UNIT}
        height={UNIT}
        fill={fillMap[type] || '#fff'}
        fillOpacity={opacity}
        stroke='#e2e8f0'
        strokeWidth='2.5'
      />
      {type === 'star' && (
        <path
          d='M10,1 L13,7 L19,8 L15,13 L16,19 L10,16 L4,19 L5,13 L1,8 L7,7 Z'
          fill='#cbd5e1'
          transform={`translate(${UNIT * 0.25}, ${UNIT * 0.25}) scale(${UNIT / 25})`}
        />
      )}
    </g>
  );
};

const House = ({ x, y, color }: { x: number; y: number; color: keyof typeof COLORS }) => {
  const hex = COLORS[color];
  return (
    <g transform={`translate(${x * UNIT}, ${y * UNIT})`}>
      <rect width={6 * UNIT} height={6 * UNIT} fill={hex} />
      <rect x={UNIT} y={UNIT} width={4 * UNIT} height={4 * UNIT} fill='#fcfcfc' rx={UNIT * 0.5} />
      {/* Precision Yard Alignment */}
      <circle
        cx={2 * UNIT}
        cy={2 * UNIT}
        r={UNIT * 0.6}
        fill={hex}
        fillOpacity={0.12}
        stroke={hex}
        strokeWidth='3'
      />
      <circle
        cx={4 * UNIT}
        cy={2 * UNIT}
        r={UNIT * 0.6}
        fill={hex}
        fillOpacity={0.12}
        stroke={hex}
        strokeWidth='3'
      />
      <circle
        cx={2 * UNIT}
        cy={4 * UNIT}
        r={UNIT * 0.6}
        fill={hex}
        fillOpacity={0.12}
        stroke={hex}
        strokeWidth='3'
      />
      <circle
        cx={4 * UNIT}
        cy={4 * UNIT}
        r={UNIT * 0.6}
        fill={hex}
        fillOpacity={0.12}
        stroke={hex}
        strokeWidth='3'
      />
    </g>
  );
};

const Pawn = ({ color, playerColorName, position, pawnIdx, canMove, onClick }: any) => {
  const pt = TokenController.getCoordinates(position, playerColorName, pawnIdx);
  const x = (pt.x / 15) * 100;
  const y = (pt.y / 15) * 100;

  return (
    <motion.div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      initial={false}
      animate={{
        left: `${x}%`,
        top: `${y}%`,
        x: '-50%',
        y: '-50%',
        scale: canMove ? 1.2 : 1,
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={{
        backgroundColor: color,
        boxShadow: `0 10px 25px ${color}66`,
      }}
      className={`absolute w-[5.5%] h-[5.5%] rounded-full flex items-center justify-center border-[3px] border-white z-[999] pointer-events-auto ${canMove ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className='absolute inset-[15%] rounded-full border border-white/20 bg-gradient-to-br from-white/40 to-transparent shadow-inner' />
      {canMove && (
        <div className='absolute inset-[-10px] rounded-full border-4 border-white/40 border-dotted animate-[spin_6s_linear_infinite]' />
      )}
    </motion.div>
  );
};
