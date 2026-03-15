// Production-grade Snake & Ladder Engine (Server Side)
// Simplified from the frontend engine for core logic verification

class SnakeLadderEngine {
    constructor(players, config = {}) {
        this.players = players.map((p, idx) => ({
            ...p,
            pos: p.pos || 0,
            consecutiveSixes: p.consecutiveSixes || 0
        }));
        this.board = {
            snakes: config.snakes || { 32: 10, 34: 6, 48: 26, 62: 18, 88: 24, 95: 56, 97: 78 },
            ladders: config.ladders || { 1: 38, 4: 14, 8: 30, 21: 42, 28: 74, 50: 67, 71: 92, 80: 99 },
            totalCells: 100
        };
        this.dice = 0;
        this.phase = 'ROLL';
        this.currentTurn = players[0].id;
        this.winner = null;
    }

    rollDice(playerId) {
        if (this.currentTurn !== playerId || this.phase !== 'ROLL') return { error: 'Not your turn' };
        
        this.dice = Math.floor(Math.random() * 6) + 1;
        this.phase = 'MOVE';
        
        const player = this.players.find(p => p.id === playerId);
        if (this.dice === 6) {
            player.consecutiveSixes++;
            if (player.consecutiveSixes === 3) {
                player.consecutiveSixes = 0;
                this.phase = 'ROLL';
                this.advanceTurn();
                return { rolled: this.dice, penalty: true };
            }
        } else {
            player.consecutiveSixes = 0;
        }
        
        return { rolled: this.dice };
    }

    moveToken(playerId) {
        if (this.currentTurn !== playerId || this.phase !== 'MOVE') return { error: 'Invalid state' };
        
        const player = this.players.find(p => p.id === playerId);
        let pos = player.pos;

        if (pos === 0) {
            if (this.dice === 6) pos = 1;
            else {
                this.phase = 'ROLL';
                this.advanceTurn();
                return { pos: player.pos };
            }
        } else {
            const nextPos = pos + this.dice;
            if (nextPos > 100) {
                this.phase = 'ROLL';
                this.advanceTurn();
                return { pos: player.pos };
            } else if (nextPos === 100) {
                player.pos = 100;
                this.winner = playerId;
                return { pos: 100, win: true };
            }
            pos = nextPos;
        }

        // Snakes and Ladders
        if (this.board.snakes[pos]) pos = this.board.snakes[pos];
        else if (this.board.ladders[pos]) pos = this.board.ladders[pos];

        player.pos = pos;
        
        if (this.dice !== 6) {
            this.advanceTurn();
        }
        this.phase = 'ROLL';
        
        return { pos: player.pos };
    }

    advanceTurn() {
        const currentIndex = this.players.findIndex(p => p.id === this.currentTurn);
        const nextIndex = (currentIndex + 1) % this.players.length;
        this.currentTurn = this.players[nextIndex].id;
    }

    getState() {
        return {
            players: this.players,
            board: this.board,
            dice: this.dice,
            phase: this.phase,
            currentTurn: this.currentTurn,
            winner: this.winner
        };
    }
}

export default SnakeLadderEngine;
