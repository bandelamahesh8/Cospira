import { Chess } from 'chess.js';
import { EventEmitter } from 'events';
import logger from '../shared/logger.js';

class ChessServer extends EventEmitter {
    constructor() {
        super();
        this.games = new Map(); // roomId -> { chess: Chess, white: userId, black: userId, lastMoveTime: number }
    }

    createGame(roomId, whiteId, blackId, config = {}) {
        const chess = new Chess();
        if (config.fen) {
            try {
                chess.load(config.fen);
            } catch (e) {
                logger.error(`Invalid FEN for room ${roomId}: ${config.fen}`);
            }
        }

        this.games.set(roomId, {
            chess,
            white: whiteId,
            black: blackId,
            lastMoveTime: Date.now(),
            config
        });
        
        logger.info(`[ChessServer] Game created: ${roomId} (${whiteId} vs ${blackId})`);
        return this.getGameState(roomId);
    }

    makeMove(roomId, userId, move) {
        const game = this.games.get(roomId);
        if (!game) {
            throw new Error('Game not found');
        }

        const { chess, white, black } = game;

        // 1. Check Turn Authority
        const isWhiteTurn = chess.turn() === 'w';
        const expectedUser = isWhiteTurn ? white : black;

        if (userId !== expectedUser) {
            logger.warn(`[ChessServer] Illegal Turn: User ${userId} tried to move but it is ${expectedUser}'s turn.`);
            throw new Error('Not your turn');
        }

        // 2. Validate Move
        let result = null;
        try {
            // Support both SAN strings and object moves
            result = chess.move(move); 
        } catch (e) {
            // chess.js throws on invalid move sometimes
        }

        if (!result) {
            logger.warn(`[ChessServer] Illegal Move: ${JSON.stringify(move)} in room ${roomId}`);
            throw new Error('Illegal move');
        }

        // 3. Update State
        game.lastMoveTime = Date.now();

        // 4. Check Game Over
        let status = 'playing';
        let winner = null;

        if (chess.isCheckmate()) {
            status = 'checkmate';
            winner = userId; // Current mover delivered checkmate
        } else if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
            status = 'draw';
        }

        return {
            success: true,
            fen: chess.fen(),
            turn: chess.turn(),
            lastMove: result, // { from, to, san, ... }
            history: chess.history({ verbose: true }),
            status,
            winner,
            inCheck: chess.inCheck()
        };
    }

    getGameState(roomId) {
        const game = this.games.get(roomId);
        if (!game) return null;

        return {
            fen: game.chess.fen(),
            turn: game.chess.turn(),
            white: game.white,
            black: game.black,
            isGameOver: game.chess.isGameOver(),
            history: game.chess.history({ verbose: true })
        };
    }

    deleteGame(roomId) {
        this.games.delete(roomId);
        logger.info(`[ChessServer] Game deleted: ${roomId}`);
    }
}

// Singleton instance
export const chessServer = new ChessServer();
