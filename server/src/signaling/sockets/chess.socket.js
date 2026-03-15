import { chessServer } from '../game-servers/ChessServer.js';
import logger from '../../shared/logger.js';

export default function registerChessHandlers(io, socket) {
    
    // Create Game (Authoritative)
    socket.on('chess:create-game', ({ roomId, whiteId, blackId, config }) => {
        try {
            // In a real scenario, this might be called by the Matchmaking Service internally, 
            // not directly by the client socket. 
            // But for testing/custom games:
            const state = chessServer.createGame(roomId, whiteId, blackId, config);
            io.to(roomId).emit('chess:game-start', state);
        } catch (e) {
            logger.error(`Error creating chess game: ${e.message}`);
        }
    });

    // Make Move
    socket.on('chess:move', ({ roomId, move }) => {
        try {
            if (!socket.user) return; // Auth check

            const result = chessServer.makeMove(roomId, socket.user.sub, move);
            
            // Broadcast Authoritative Update
            io.to(roomId).emit('chess:state-update', result);
            
            if (result.isGameOver) {
                io.to(roomId).emit('chess:game-over', { 
                    winner: result.winner, 
                    reason: result.status 
                });
                
                // TODO: Save result to DB via GameService
                // chessServer.deleteGame(roomId) or keep for replay
            }

        } catch (e) {
            // Send error only to the sender
            socket.emit('chess:error', { message: e.message });
        }
    });

    // Sync State (Reconnect)
    socket.on('chess:sync', ({ roomId }) => {
        const state = chessServer.getGameState(roomId);
        if (state) {
            socket.emit('chess:state-update', { ...state, success: true });
        }
    });
}
