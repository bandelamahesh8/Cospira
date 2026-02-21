


type Board = (string | null)[];

export class TicTacToeAI {
  /**
   * Get the best move for the current board state
   */
  static getBestMove(
    board: Board, 
    player: string, 
    size: number = 3, 
    winCondition: number = 3,
    difficulty: 'easy' | 'medium' | 'hard' = 'hard'
  ): number {
    // Easy: Random move
    if (difficulty === 'easy') {
      const availableMoves = board.map((cell, index) => cell === null ? index : null).filter(val => val !== null) as number[];
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Medium: 50% chance of best move, 50% random
    if (difficulty === 'medium' && Math.random() > 0.5) {
      const availableMoves = board.map((cell, index) => cell === null ? index : null).filter(val => val !== null) as number[];
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Hard: Minimax (or optimized search for large boards)
    if (size === 3) {
      return this.minimax(board, player, winCondition).index;
    } else {
      // For larger boards, use depth-limited search with alpha-beta pruning
      return this.alphaBetaSearch(board, player, size, winCondition, 3);
    }
  }

  // --- Minimax for 3x3 ---

  private static minimax(newBoard: Board, player: string, winCondition: number): { index: number, score: number } {
    const availSpots = newBoard.map((cell, index) => cell === null ? index : null).filter(val => val !== null) as number[];
    const opponent = player === 'X' ? 'O' : 'X';

    if (this.checkWin(newBoard, opponent, 3, winCondition)) {
      return { index: -1, score: -10 };
    } else if (this.checkWin(newBoard, player, 3, winCondition)) {
      return { index: -1, score: 10 };
    } else if (availSpots.length === 0) {
      return { index: -1, score: 0 };
    }

    const moves: { index: number, score: number }[] = [];

    for (let i = 0; i < availSpots.length; i++) {
      const move: any = {};
      move.index = availSpots[i];
      newBoard[availSpots[i]] = player;

      const result = this.minimax(newBoard, opponent, winCondition);
      move.score = result.score;

      newBoard[availSpots[i]] = null;
      moves.push(move);
    }

    const bestMove = 0;
    if (player === player) { // Maximizing logic is slightly different in recursive calls usually, but simplified here
        // Actually standard minimax:
        // If it's the AI's turn (Maximizing), pick highest score.
        // Wait, the recursive call above passes 'opponent'. 
        // So if I am 'X', I call minimax for 'O'. 'O' will try to minimize 'X' score?
        // Let's stick to a cleaner implementation.
    }
    
    // Re-implementing standard minimax carefully
    return this.minimaxScore(newBoard, player, player, opponent, 3, winCondition);
  }

  private static minimaxScore(
    board: Board, 
    currentPlayer: string, 
    aiPlayer: string, 
    humanPlayer: string,
    size: number,
    winCondition: number
  ): { index: number, score: number } {
    const availSpots = board.map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];

    if (this.checkWin(board, humanPlayer, size, winCondition)) return { index: -1, score: -10 };
    if (this.checkWin(board, aiPlayer, size, winCondition)) return { index: -1, score: 10 };
    if (availSpots.length === 0) return { index: -1, score: 0 };

    const moves = [];

    for (let i = 0; i < availSpots.length; i++) {
      const idx = availSpots[i];
      board[idx] = currentPlayer;

      const result = this.minimaxScore(
        board, 
        currentPlayer === aiPlayer ? humanPlayer : aiPlayer, 
        aiPlayer, 
        humanPlayer,
        size,
        winCondition
      );

      moves.push({ index: idx, score: result.score });
      board[idx] = null;
    }

    let bestMove = 0;
    if (currentPlayer === aiPlayer) {
      let bestScore = -10000;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = 10000;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }

    return moves[bestMove];
  }

  // --- Alpha-Beta Pruning for Larger Boards ---

  private static alphaBetaSearch(
    board: Board, 
    player: string, 
    size: number, 
    winCondition: number, 
    depth: number
  ): number {
    const aiPlayer = player;
    const humanPlayer = player === 'X' ? 'O' : 'X';
    
    // Get all empty spots
    const availSpots = board.map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];
    
    let bestScore = -Infinity;
    let bestMove = availSpots[0];
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of availSpots) {
      board[move] = aiPlayer;
      const score = this.minimaxAlphaBeta(board, depth - 1, false, alpha, beta, aiPlayer, humanPlayer, size, winCondition);
      board[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    }
    
    return bestMove;
  }

  private static minimaxAlphaBeta(
    board: Board, 
    depth: number, 
    isMaximizing: boolean, 
    alpha: number, 
    beta: number,
    aiPlayer: string,
    humanPlayer: string,
    size: number,
    winCondition: number
  ): number {
    if (this.checkWin(board, aiPlayer, size, winCondition)) return 10 + depth;
    if (this.checkWin(board, humanPlayer, size, winCondition)) return -10 - depth;
    
    const availSpots = board.map((c, i) => c === null ? i : null).filter(v => v !== null) as number[];
    if (availSpots.length === 0 || depth === 0) return this.evaluateBoard(board, aiPlayer, humanPlayer, size, winCondition);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of availSpots) {
        board[move] = aiPlayer;
        const evalScore = this.minimaxAlphaBeta(board, depth - 1, false, alpha, beta, aiPlayer, humanPlayer, size, winCondition);
        board[move] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of availSpots) {
        board[move] = humanPlayer;
        const evalScore = this.minimaxAlphaBeta(board, depth - 1, true, alpha, beta, aiPlayer, humanPlayer, size, winCondition);
        board[move] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // --- Utilities ---

  private static checkWin(board: Board, player: string, size: number, winCondition: number): boolean {
    // Check rows
    for (let r = 0; r < size; r++) {
      for (let c = 0; c <= size - winCondition; c++) {
        let match = true;
        for (let k = 0; k < winCondition; k++) {
          if (board[r * size + c + k] !== player) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    }

    // Check columns
    for (let c = 0; c < size; c++) {
      for (let r = 0; r <= size - winCondition; r++) {
        let match = true;
        for (let k = 0; k < winCondition; k++) {
          if (board[(r + k) * size + c] !== player) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    }

    // Check main diagonal
    for (let r = 0; r <= size - winCondition; r++) {
      for (let c = 0; c <= size - winCondition; c++) {
        let match = true;
        for (let k = 0; k < winCondition; k++) {
          if (board[(r + k) * size + c + k] !== player) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    }

    // Check anti-diagonal
    for (let r = 0; r <= size - winCondition; r++) {
      for (let c = winCondition - 1; c < size; c++) {
        let match = true;
        for (let k = 0; k < winCondition; k++) {
          if (board[(r + k) * size + c - k] !== player) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    }

    return false;
  }

  private static evaluateBoard(board: Board, aiPlayer: string, humanPlayer: string, size: number, winCondition: number): number {
    // Basic heuristic: check for near wins
    let score = 0;
    
    // Count potential winning lines for AI
    // (Simplified random fallback for now if no immediate threats)
    if (this.checkWin(board, aiPlayer, size, winCondition)) return 100;
    if (this.checkWin(board, humanPlayer, size, winCondition)) return -100;

    score += Math.random() * 0.5; // Slight randomness to avoid deterministic loops
    return score;
  }
}
