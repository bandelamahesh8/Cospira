import { ludoServer } from '../game-servers/LudoServer.js';
import logger from '../logger.js';

export default function registerLudoHandlers(io, socket) {

    // Create Game (Authoritative)
    socket.on('ludo:create', ({ roomId, players }) => {
        try {
            // Check if game exists
            if (ludoServer.getGame(roomId)) {
                socket.emit('ludo:state', ludoServer.getGame(roomId).getState());
                return;
            }
            
            const state = ludoServer.createGame(roomId, players);
            io.to(roomId).emit('ludo:state', state);
        } catch (e) {
            logger.error(`Error creating ludo game: ${e.message}`);
        }
    });

    // Roll Dice
    socket.on('ludo:roll', ({ roomId }) => {
        try {
            if (!socket.user) return;
            const result = ludoServer.handleRoll(roomId, socket.user.sub);
            
            // Broadcast Roll Result
            io.to(roomId).emit('ludo:roll_result', { 
                playerId: socket.user.sub, 
                dice: result.rolled,
                autoPass: result.autoPass
            });

            // Broadcast New State (Phase might change)
            io.to(roomId).emit('ludo:state', result.state);

        } catch (e) {
            socket.emit('ludo:error', { message: e.message });
        }
    });

    // Move Token
    socket.on('ludo:move', ({ roomId, tokenIndex }) => {
        try {
            if (!socket.user) return;
            const result = ludoServer.handleMove(roomId, socket.user.sub, tokenIndex);
            
            // Broadcast Move
            io.to(roomId).emit('ludo:move_result', {
                playerId: socket.user.sub,
                tokenIndex,
                success: true
            });

            // Broadcast New State
            io.to(roomId).emit('ludo:state', result.state);

            // Check Win
            if (result.state.winner) {
                io.to(roomId).emit('ludo:game_over', { winner: result.state.winner });
            }

        } catch (e) {
            socket.emit('ludo:error', { message: e.message });
        }
    });

    // Sync
    socket.on('ludo:sync', ({ roomId }) => {
        const game = ludoServer.getGame(roomId);
        if (game) {
            socket.emit('ludo:state', game.getState());
        }
    });
}
