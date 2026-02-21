// LudoEngine.js - Advanced Server Logic
// Handles all rules: 52-cell track, Zones, Safe Spots, Power-ups, AI, and Win Conditions.

export default class LudoEngine {
    constructor(players, config = {}) {
        // players: array of { id, name, color }
        this.players = (players || []).map((p, idx) => ({
             ...p,
             tokens: p.tokens || [0, 0, 0, 0],
             finishedTokens: p.finishedTokens || 0,
             rank: p.rank || null,
             score: p.score || 0,
             kills: p.kills || 0,
             combo: p.combo || 0,
             isAI: p.isAI || false,
        }));
        
        this.turnIndex = 0;
        this.dice = null;
        this.phase = 'ROLL'; // ROLL | MOVE | END
        this.winner = null;
        this.logs = [];
        this.turnStartTime = Date.now();
        this.lastAction = null;
        this.consecutiveSixes = 0;

        // Configuration
        this.config = {
            enablePowerUps: config.enablePowerUps ?? true,
            doubleOnSix: config.doubleOnSix ?? true,
            ...config
        };

        // Constants
        this.SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47]; // Global indices
        this.PLAYER_OFFSETS = { green: 0, yellow: 13, blue: 26, red: 39 };
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
        return {
            players: this.players,
            turn: this.players[this.turnIndex]?.id || null,
            dice: this.dice,
            phase: this.phase,
            winner: this.winner,
            turnStartTime: this.turnStartTime,
            lastAction: this.lastAction,
            logs: this.logs.slice(-10)
        };
    }

    rollDice(playerId) {
        if (this.turnIndex === -1 || !this.players[this.turnIndex]) return { error: 'Invalid turn state' };
        if (this.phase !== 'ROLL') return { error: 'Not roll phase' };
        if (this.players[this.turnIndex].id !== playerId) return { error: 'Not your turn' };

        this.dice = Math.floor(Math.random() * 6) + 1;
        
        if (this.dice === 6) {
            this.consecutiveSixes++;
            if (this.consecutiveSixes >= 3) {
                this.dice = 0; // Penalty for triple 6
                this.addLog(`${this.players[this.turnIndex].name} rolled three 6s! Turn skipped.`, 'warning');
                this.passTurn();
                return { rolled: 0, autoPass: true };
            }
        } else {
            this.consecutiveSixes = 0;
        }

        this.phase = 'MOVE';
        this.lastAction = { type: 'ROLL', playerId, dice: this.dice };
        
        // Check for moves
        if (!this.canMoveAnyToken()) {
             return { rolled: this.dice, autoPass: true };
        }
        
        return { rolled: this.dice, autoPass: false };
    }

    getValidMoves(player) {
        if (!player || !player.tokens) return [];
        return player.tokens
            .map((pos, idx) => ({ pos, idx }))
            .filter(item => this.isValidMove(item.pos))
            .map(item => item.idx);
    }

    isValidMove(currentPos) {
        if (currentPos === 0) return this.dice === 6;
        if (currentPos === 57) return false;
        return (currentPos + this.dice <= 57);
    }

    moveToken(playerId, tokenIndex) {
        if (this.turnIndex === -1 || !this.players[this.turnIndex]) return { error: 'Invalid turn state' };
        if (this.phase !== 'MOVE') return { error: 'Not move phase' };
        if (this.players[this.turnIndex].id !== playerId) return { error: 'Not your turn' };
        
        const p = this.players[this.turnIndex];
        if (!p.tokens || p.tokens[tokenIndex] === undefined) return { error: 'Invalid token' };
        const currentPos = p.tokens[tokenIndex];

        if (!this.isValidMove(currentPos)) return { error: 'Invalid move' };

        let newPos = currentPos === 0 ? 1 : currentPos + this.dice;
        
        // Capture logic
        const captured = this.checkCapture(newPos, p);
        if (captured.length > 0) {
            captured.forEach(hit => {
                hit.player.tokens[hit.tokenIndex] = 0;
                p.kills = (p.kills || 0) + 1;
                p.combo = (p.combo || 0) + 1;
                this.addLog(`${p.name} captured ${hit.player.name}'s token!`, 'kill');
            });
        } else {
            p.combo = 0;
        }

        p.tokens[tokenIndex] = newPos;
        this.lastAction = { type: 'MOVE', playerId, tokenIndex, from: currentPos, to: newPos, captured: captured.length > 0 };

        if (newPos === 57) {
            p.finishedTokens++;
            p.score += 100;
            this.addLog(`${p.name} reached home!`, 'success');
            if (p.finishedTokens === 4) {
                this.winner = p.id;
                this.phase = 'END';
                this.addLog(`${p.name} WINS!`, 'victory');
            }
        }

        // Streak logic
        if (this.dice === 6 && this.config.doubleOnSix && !this.winner) {
            this.phase = 'ROLL';
        } else {
            this.passTurn();
        }

        return { success: true };
    }

    checkCapture(localPos, player) {
        if (localPos === 0 || localPos >= 52) return []; // Base or Home stretch safe
        
        const globalPos = this.toGlobal(localPos, player.color);
        if (this.SAFE_SPOTS.includes(globalPos)) return [];

        const hits = [];
        this.players.forEach(p => {
            if (p.id === player.id) return;
            p.tokens.forEach((pos, idx) => {
                if (pos > 0 && pos < 52 && this.toGlobal(pos, p.color) === globalPos) {
                    hits.push({ player: p, tokenIndex: idx });
                }
            });
        });
        return hits;
    }

    toGlobal(localPos, color) {
        const offset = this.PLAYER_OFFSETS[color];
        return (localPos - 1 + offset) % 52;
    }

    passTurn() {
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
        this.phase = 'ROLL';
        this.dice = null;
        this.consecutiveSixes = 0;
        this.turnStartTime = Date.now();
    }

    canMoveAnyToken() {
        const p = this.players[this.turnIndex];
        return p.tokens.some(t => this.isValidMove(t));
    }

    addLog(message, type) {
        this.logs.push({ message, type, time: Date.now() });
    }
}
