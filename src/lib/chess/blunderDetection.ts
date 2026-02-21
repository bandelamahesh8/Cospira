/**
 * Blunder Detection Utility
 * Detects when a move would lose significant material
 */

import { Chess } from 'chess.js';

const PIECE_VALUES = {
  p: 1,   // Pawn
  n: 3,   // Knight
  b: 3,   // Bishop
  r: 5,   // Rook
  q: 9,   // Queen
  k: 0,   // King (infinite value, but 0 for calculation)
};

/**
 * Calculate total material value for the current player
 */
const calculateMaterial = (game: Chess): number => {
  let material = 0;
  const board = game.board();
  const currentTurn = game.turn();
  
  board.forEach(row => {
    row.forEach(square => {
      if (square && square.color === currentTurn) {
        material += PIECE_VALUES[square.type as keyof typeof PIECE_VALUES] || 0;
      }
    });
  });
  
  return material;
};

/**
 * Detect if a move is a blunder (loses material without compensation)
 * Returns true if material loss >= threshold
 */
export const detectBlunder = (
  game: Chess, 
  move: { from: string; to: string; promotion?: string },
  threshold: number = 3
): boolean => {
  try {
    // Calculate material before move
    const beforeMaterial = calculateMaterial(game);
    
    // Create a test game and make the move
    const testGame = new Chess(game.fen());
    const result = testGame.move(move);
    
    if (!result) return false; // Invalid move
    
    // Calculate material after move
    const afterMaterial = calculateMaterial(testGame);
    
    // Material loss (positive means we lost material)
    const materialLoss = beforeMaterial - afterMaterial;
    
    // Consider it a blunder if we lose >= threshold points
    return materialLoss >= threshold;
  } catch (error) {
    console.warn('[Blunder Detection] Error:', error);
    return false;
  }
};

/**
 * Get a description of the material loss
 */
export const getBlunderDescription = (
  game: Chess,
  move: { from: string; to: string; promotion?: string }
): string => {
  const beforeMaterial = calculateMaterial(game);
  const testGame = new Chess(game.fen());
  testGame.move(move);
  const afterMaterial = calculateMaterial(testGame);
  const loss = beforeMaterial - afterMaterial;
  
  if (loss >= 9) return 'You may lose your Queen!';
  if (loss >= 5) return 'You may lose your Rook!';
  if (loss >= 3) return 'You may lose a minor piece!';
  return 'This move may lose material.';
};
