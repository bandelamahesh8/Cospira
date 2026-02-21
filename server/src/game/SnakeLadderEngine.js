
export default class SnakeLadderEngine {
    constructor(players) {
        this.players = (players || []).map(p => ({
            ...p,
            pos: p.pos !== undefined ? p.pos : 0, 
            rank: p.rank || null,
            finished: p.finished || false
        }));
        
        this.turnIndex = 0;
        this.dice = null;
        this.winner = null;
        this.logs = [];
        this.phase = 'ROLL'; // ROLL | MOVE | END
        this.lastAction = null;

        // Configuration
        this.WIN_POS = 100;
        
        // Classic Layout
        this.SNAKES = {
            16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78
        };
        
        this.LADDERS = {
            1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100
        };
    }

    setTurn(playerId) {
        if (!this.players || this.players.length === 0) {
            this.turnIndex = 0;
            return;
        }
        const idx = this.players.findIndex(p => p.id === playerId);
        this.turnIndex = idx === -1 ? 0 : idx;
    }

    getState() {
        const turnId = (this.players.length > 0 && this.players[this.turnIndex]) 
            ? this.players[this.turnIndex].id 
            : null;
            
        return {
            players: this.players,
            turn: turnId,
            dice: this.dice,
            phase: this.phase,
            winner: this.winner,
            lastAction: this.lastAction
        };
    }

    rollDice(playerId) {
        if (this.turnIndex === -1 || !this.players[this.turnIndex]) return { error: 'Invalid turn state' };
        if (this.phase !== 'ROLL') return { error: 'Not roll phase' };
        if (this.players[this.turnIndex].id !== playerId) return { error: 'Not your turn' };

        this.dice = Math.floor(Math.random() * 6) + 1;
        this.phase = 'MOVE';
        this.lastAction = { type: 'ROLL', playerId, dice: this.dice };
        return { rolled: this.dice };
    }

    moveToken(playerId) {
        if (this.turnIndex === -1 || !this.players[this.turnIndex]) return { error: 'Invalid turn state' };
        if (this.phase !== 'MOVE') return { error: 'Not move phase' };
        if (this.players[this.turnIndex].id !== playerId) return { error: 'Not your turn' };

        const p = this.players[this.turnIndex];
        let newPos = p.pos + this.dice;

        if (newPos > this.WIN_POS) {
            const overshoot = newPos - this.WIN_POS;
            newPos = this.WIN_POS - overshoot;
        }

        let effect = null;
        if (this.SNAKES[newPos]) {
            newPos = this.SNAKES[newPos];
            effect = 'SNAKE';
        } else if (this.LADDERS[newPos]) {
            newPos = this.LADDERS[newPos];
            effect = 'LADDER';
        }

        p.pos = newPos;
        this.lastAction = { type: 'MOVE', playerId, pos: newPos, effect };

        if (newPos === this.WIN_POS) {
            this.winner = p.id;
            p.finished = true;
            this.lastAction = { type: 'WIN', playerId };
            return { success: true, winner: this.winner };
        }

        if (this.dice === 6) {
           this.phase = 'ROLL';
           this.dice = null;
        } else {
           this.passTurn();
        }

        return { success: true };
    }

    passTurn() {
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
        this.phase = 'ROLL';
        this.dice = null;
    }
}
