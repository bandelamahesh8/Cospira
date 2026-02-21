import LudoEngine from '../game/LudoEngine.js';
import logger from '../logger.js';
import { EventEmitter } from 'events';

class LudoServer extends EventEmitter {
    constructor() {
        super();
        this.games = new Map(); // roomId -> LudoEngine instance
    }

    createGame(roomId, players) {
        // players: [{ id, name, color }]
        const engine = new LudoEngine(players);
        this.games.set(roomId, engine);
        logger.info(`[LudoServer] Game created: ${roomId} with ${players.length} players`);
        return engine.getState();
    }

    getGame(roomId) {
        return this.games.get(roomId);
    }

    handleRoll(roomId, userId) {
        const game = this.games.get(roomId);
        if (!game) throw new Error('Game not found');

        const result = game.rollDice(userId);
        if (result.error) throw new Error(result.error);
        
        return {
            ...result,
            state: game.getState()
        };
    }

    handleMove(roomId, userId, tokenIndex) {
        const game = this.games.get(roomId);
        if (!game) throw new Error('Game not found');

        const result = game.moveToken(userId, tokenIndex);
        if (result.error) throw new Error(result.error);

        return {
            ...result,
            state: game.getState()
        };
    }

    deleteGame(roomId) {
        this.games.delete(roomId);
    }
}

export const ludoServer = new LudoServer();
