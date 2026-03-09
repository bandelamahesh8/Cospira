import logger from '../logger.js';
import eventLogger from '../services/EventLogger.js';
import { getRoom, saveRoom } from '../redis.js';
import { sanitizeRoomId } from '../utils/sanitize.js';
import LudoEngine from '../game/LudoEngine.js';
import SnakeLadderEngine from '../game/SnakeLadderEngine.js';
import { Chess } from 'chess.js';

const TURN_LIMIT = 30000; // 30 seconds
const activeTimers = new Map();

export default function registerGameHandlers(io, socket) {
  
  const clearTimer = (roomId) => {
    if (activeTimers.has(roomId)) {
      clearTimeout(activeTimers.get(roomId));
      activeTimers.delete(roomId);
    }
  };

  const startTimer = (roomId, playerId) => {
    clearTimer(roomId);
    const timerId = setTimeout(async () => {
      logger.info(`Turn timeout for player ${playerId} in room ${roomId}`);
      await handleTimeout(roomId, playerId);
    }, TURN_LIMIT);
    activeTimers.set(roomId, timerId);
  };

  const handleTimeout = async (roomId, playerId) => {
    try {
        const room = await getRoom(roomId);
        if (!room || !room.gameState || !room.gameState.isActive || room.gameState.turn !== playerId) return;

        // Initialize timeouts if missing
        if (!room.gameState.timeouts) room.gameState.timeouts = {};
        
        // Increment timeout counter for this player
        room.gameState.timeouts[playerId] = (room.gameState.timeouts[playerId] || 0) + 1;
        logger.info(`Player ${playerId} timeout count: ${room.gameState.timeouts[playerId]}/3 in room ${roomId}`);

        // DISQUALIFICATION RULE: 3 consecutive timeouts = LOSS
        if (room.gameState.timeouts[playerId] >= 3) {
            logger.warn(`Player ${playerId} disqualified for 3 consecutive timeouts in room ${roomId}`);
            
            // Find the winner (the other player for 2-player games)
            const remainingPlayers = room.gameState.players.filter(p => p.id !== playerId);
            const winner = remainingPlayers.length > 0 ? remainingPlayers[0].id : 'draw';
            
            room.gameState.winner = winner;
            room.gameState.isActive = false;
            room.gameState.disqualifiedPlayer = playerId;
            
            await saveRoom(room);
            io.to(roomId).emit('game-ended', room.gameState);
            clearTimer(roomId);
            return;
        }

        if (room.gameState.type === 'ludo') {
            const engine = new LudoEngine(room.gameState.players);
            Object.assign(engine, room.gameState); 
            if (engine.phase === 'ROLL') {
                const res = engine.rollDice(playerId);
                if (res.autoPass) {
                  setTimeout(async () => {
                    const r2 = await getRoom(roomId);
                    if (r2 && r2.gameState?.turn === playerId) {
                      const e2 = new LudoEngine(r2.gameState.players);
                      Object.assign(e2, r2.gameState);
                      e2.setTurn(r2.gameState.turn);
                      e2.passTurn();
                      r2.gameState = { ...r2.gameState, ...e2.getState() };
                      await saveRoom(r2);
                      io.to(roomId).emit('game-move', r2.gameState);
                      startTimer(roomId, r2.gameState.turn);
                    }
                  }, 2000);
                }
            } else if (engine.phase === 'MOVE') {
                engine.passTurn(); // Force pass on timeout during move
            }
            
            room.gameState = { ...room.gameState, ...engine.getState() };
        } else if (room.gameState.type === 'snakeladder') {
            const engine = new SnakeLadderEngine(room.gameState.players);
            Object.assign(engine, room.gameState);
            engine.setTurn(room.gameState.turn);
            
            if (engine.phase === 'ROLL') {
                engine.rollDice(playerId);
                // For S&L, automatically move after roll
                setTimeout(() => handleSLMove(roomId, playerId).catch(e => logger.error("SL Timeout Move Error", e)), 1500);
            } else {
                engine.passTurn();
            }
            room.gameState = { ...room.gameState, ...engine.getState() };
        } else {
            const players = room.gameState.players;
            const currentIndex = players.findIndex(p => p.id === playerId);
            const nextIndex = (currentIndex + 1) % players.length;
            room.gameState.turn = players[nextIndex].id;
        }

        room.gameState.turnStartTime = Date.now();
        await saveRoom(room);
        io.to(roomId).emit('game-move', room.gameState);
        startTimer(roomId, room.gameState.turn);
    } catch (err) {
        logger.error(`Error in handleTimeout for room ${roomId}:`, err);
    }
  };

  // --- INTERNAL HANDLERS ---

  const handleLudoRoll = async (roomId, userId) => {
    try {
        const room = await getRoom(roomId);
        if (!room || room.gameState?.turn !== userId) throw new Error('Not your turn');

        const engine = new LudoEngine(room.gameState.players);
        Object.assign(engine, room.gameState);
        const tIdx = engine.players.findIndex(p => p.id === engine.turn);
        engine.turnIndex = tIdx === -1 ? 0 : tIdx;
        engine.phase = room.gameState.phase || 'ROLL';

        const result = engine.rollDice(userId);
        if (result.error) throw new Error(result.error);

        room.gameState = { ...room.gameState, ...engine.getState() };
        await saveRoom(room);
        io.to(roomId).emit('game-move', room.gameState);

        if (result.autoPass) {
            setTimeout(async () => {
                try {
                    const r2 = await getRoom(roomId);
                    if (!r2 || r2.gameState?.turn !== userId || r2.gameState.phase !== 'MOVE') return;
                    const e2 = new LudoEngine(r2.gameState.players);
                    Object.assign(e2, r2.gameState);
                    e2.passTurn();
                    r2.gameState = { ...r2.gameState, ...e2.getState() };
                    await saveRoom(r2);
                    io.to(roomId).emit('game-move', r2.gameState);
                    startTimer(roomId, r2.gameState.turn);
                } catch (e) {
                    logger.error("Ludo AutoPass Error:", e);
                }
            }, 2000);
        } else {
            startTimer(roomId, room.gameState.turn);
        }
        
        return { rolled: result.rolled };
    } catch (err) {
        logger.error(`Error in handleLudoRoll for room ${roomId}:`, err);
        throw err;
    }
  };

  const handleLudoMove = async (roomId, userId, tokenIndex) => {
    try {
        const room = await getRoom(roomId);
        if (!room || room.gameState?.turn !== userId) throw new Error('Not your turn');

        const engine = new LudoEngine(room.gameState.players);
        Object.assign(engine, room.gameState);
        const tIdx = engine.players.findIndex(p => p.id === engine.turn);
        engine.turnIndex = tIdx === -1 ? 0 : tIdx;
        engine.phase = 'MOVE';

        const result = engine.moveToken(userId, tokenIndex);
        if (result.error) throw new Error(result.error);

        room.gameState = { ...room.gameState, ...engine.getState() };
        await saveRoom(room);

        io.to(roomId).emit('game-move', room.gameState);
        if (room.gameState.winner) {
            // Update Scores
            if (!room.scores) room.scores = {};
            room.scores[room.gameState.winner] = (room.scores[room.gameState.winner] || 0) + 20; // 20 points for win
            
            io.to(roomId).emit('game-ended', room.gameState);
            // room.status = 'LOBBY'; 
            await saveRoom(room);
            clearTimer(roomId);
        } else {
            startTimer(roomId, room.gameState.turn);
        }
    } catch (err) {
        logger.error(`Error in handleLudoMove for room ${roomId}:`, err);
        throw err;
    }
  };

  const handleSLRoll = async (roomId, userId) => {
    try {
        const room = await getRoom(roomId);
        if (!room || room.gameState?.turn !== userId) throw new Error('Not your turn');

        const engine = new SnakeLadderEngine(room.gameState.players);
        Object.assign(engine, room.gameState);
        engine.setTurn(room.gameState.turn);

        const result = engine.rollDice(userId);
        if (result.error) throw new Error(result.error);

        room.gameState = { ...room.gameState, ...engine.getState() };
        await saveRoom(room);
        io.to(roomId).emit('game-move', room.gameState);
        
        // Automatically move after dice roll animation
        setTimeout(() => {
            handleSLMove(roomId, userId).catch(err => logger.error("Auto SL Move Error:", err));
        }, 1500);

        return { rolled: result.rolled };
    } catch (err) {
        logger.error(`Error in handleSLRoll for room ${roomId}:`, err);
        throw err;
    }
  };

  const handleSLMove = async (roomId, userId) => {
    try {
        const room = await getRoom(roomId);
        if (!room || room.gameState?.turn !== userId) throw new Error('Not your turn');

        const engine = new SnakeLadderEngine(room.gameState.players);
        Object.assign(engine, room.gameState);
        engine.setTurn(room.gameState.turn);

        const result = engine.moveToken(userId);
        if (result.error) throw new Error(result.error);

        room.gameState = { ...room.gameState, ...engine.getState() };
        await saveRoom(room);
        io.to(roomId).emit('game-move', room.gameState);

        if (room.gameState.winner) {
            // Update Scores
            if (!room.scores) room.scores = {};
            room.scores[room.gameState.winner] = (room.scores[room.gameState.winner] || 0) + 15; // 15 points for win
            
            io.to(roomId).emit('game-ended', room.gameState);
            // room.status = 'LOBBY';
            await saveRoom(room);
            clearTimer(roomId);
        } else {
            startTimer(roomId, room.gameState.turn);
        }
    } catch (err) {
        logger.error(`Error in handleSLMove for room ${roomId}:`, err);
        throw err;
    }
  };

  const handleChessMove = async (roomId, userId, move) => {
    const room = await getRoom(roomId);
    if (!room || room.gameState?.turn !== userId) throw new Error('Not your turn');

    const chess = new Chess(room.gameState.board);
    let result;
    try {
        result = chess.move(move);
    } catch (e) {}

    // Auto-promote to Queen if move failed and might be a promotion
    if (!result) {
        try {
            result = chess.move({ ...move, promotion: 'q' });
        } catch (e) {}
    }

    if (!result) throw new Error('Invalid chess move');

    room.gameState.board = chess.fen();
    room.gameState.lastMove = move;

    if (chess.isGameOver()) {
        room.gameState.winner = chess.isCheckmate() ? userId : 'draw';
        room.gameState.isActive = false;
        room.status = 'LOBBY';
        io.to(roomId).emit('game-ended', room.gameState);
        clearTimer(roomId);
    } else {
        const nextPlayer = room.gameState.players.find(p => p.id !== userId)?.id;
        room.gameState.turn = nextPlayer;
        startTimer(roomId, nextPlayer);
    }

    await saveRoom(room);
    io.to(roomId).emit('game-move', room.gameState);
  };

  const handleXOXOMove = async (roomId, userId, index) => {
    const room = await getRoom(roomId);
    if (!room || room.gameState?.turn !== userId) throw new Error('Not your turn');
    if (room.gameState.board[index] !== null) throw new Error('Spot taken');

    const playerRole = room.gameState.players.find(p => p.id === userId)?.role;
    room.gameState.board[index] = playerRole;

    const checkWin = (board) => {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (const [a,b,c] of lines) { 
            if (board[a] && board[a]===board[b] && board[a]===board[c]) {
                return { result: board[a], line: [a,b,c] };
            }
        }
        return board.every(cell => cell !== null) ? { result: 'draw', line: null } : null;
    };
    const winData = checkWin(room.gameState.board);

    if (winData) {
        room.gameState.winner = winData.result === 'draw' ? 'draw' : userId;
        room.gameState.winningLine = winData.line; // Store winning line in state
        room.gameState.isActive = false;
        
        // Update Scores
        if (winData.result !== 'draw') {
            if (!room.scores) room.scores = {};
            room.scores[userId] = (room.scores[userId] || 0) + 10; // 10 points for win
        }
        
        // Don't set status to LOBBY yet, let the game component show the victory screen
        // room.status = 'LOBBY'; 
        io.to(roomId).emit('game-ended', room.gameState);
        clearTimer(roomId);
    } else {
        const nextPlayer = room.gameState.players.find(p => p.id !== userId)?.id;
        room.gameState.turn = nextPlayer;
        startTimer(roomId, nextPlayer);
    }

    await saveRoom(room);
    io.to(roomId).emit('game-move', room.gameState);
  };

  // --- SOCKET EVENTS ---

  const canControlGame = (room) => {
    const uid = socket.user?.id;
    return room && uid && (room.hostId === uid || (room.coHosts && room.coHosts.includes(uid)));
  };

  socket.on('start-game', async ({ roomId, type, players }, callback) => {
    try {
      const rid = sanitizeRoomId(roomId);
      if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
      const room = await getRoom(rid);
      if (!canControlGame(room)) return callback?.({ success: false, error: 'Only host or co-host can start games' });
      const memberCount = room.users ? Object.keys(room.users).length : 0;
      if (memberCount < 2) return callback?.({ success: false, error: 'Minimum 2 members in room required' });
      const maxPlayers = { chess: 2, 'chess-puzzle': 2, xoxo: 2, ludo: 4, snakeladder: 4, 'ultimate-xoxo': 2, connect4: 2, checkers: 2, battleship: 2 }[type] ?? 2;
      if (!players || players.length < 2 || players.length > maxPlayers) return callback?.({ success: false, error: `Invalid player count. This game allows 2–${maxPlayers} players.` });

      let gameState = {
        isActive: true,
        type,
        players: [],
        turn: players[0],
        turnStartTime: Date.now(),
        winner: null,
        timeouts: {}
      };

      if (type === 'ludo') {
        const ludoPlayers = players.map((id, idx) => {
          const userObj = room.users && Object.values(room.users).find(u => u.id === id);
          return {
            id,
            name: userObj?.name || 'Player ' + (idx + 1),
            color: ['red', 'green', 'yellow', 'blue'][idx % 4]
          };
        });
        const engine = new LudoEngine(ludoPlayers);
        gameState = { ...gameState, ...engine.getState() };
      } else if (type === 'snakeladder') {
         const slPlayers = players.map((id, idx) => {
            const userObj = room.users && Object.values(room.users).find(u => u.id === id);
            return {
                id,
                name: userObj?.name || 'Player ' + (idx + 1),
                color: ['red', 'blue', 'green', 'yellow'][idx % 4]
            };
        });
        const engine = new SnakeLadderEngine(slPlayers);
        gameState = { ...gameState, ...engine.getState() };
      } else if (type === 'chess') {
        const chess = new Chess();
        gameState.board = chess.fen();
        gameState.players = players.map((id, idx) => {
            const userObj = room.users && Object.values(room.users).find(u => u.id === id);
            return { id, name: userObj?.name || 'Player ' + (idx + 1), role: idx === 0 ? 'white' : 'black' };
        });
      } else if (type === 'chess-puzzle') {
        gameState.board = config?.puzzleFen || 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
        gameState.players = players.map((id, idx) => {
            const userObj = room.users && Object.values(room.users).find(u => u.id === id);
            return { id, name: userObj?.name || 'Player ' + (idx + 1), role: 'white' }; // both play as white
        });
        gameState.turn = 'all'; // Special turn state meaning anyone can solve
      } else if (type === 'xoxo') {
        gameState.board = Array(9).fill(null);
        gameState.players = players.map((id, idx) => {
            const userObj = room.users && Object.values(room.users).find(u => u.id === id);
            return { id, name: userObj?.name || 'Player ' + (idx + 1), role: idx === 0 ? 'x' : 'o' };
        });
      }

      room.gameState = gameState;
      room.status = 'IN_GAME';
      if (!room.scores) room.scores = {}; // Ensure scores object exists
      await saveRoom(room);
      
      io.to(rid).emit('game-started', gameState);
      io.to(rid).emit('room-status-updated', { status: 'IN_GAME' });
      
      // Log Activity for all participants
      await Promise.all(players.map(pId => 
        eventLogger.logGameStarted(rid, pId, type, players)
      ));
      
      startTimer(rid, gameState.turn);
      callback?.({ success: true });
    } catch (err) {
      logger.error('Start game error:', err);
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on('game-ludo-roll', async ({ roomId }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        const result = await handleLudoRoll(rid, socket.user?.id);
        callback?.({ success: true, ...result });
    } catch (err) { callback?.({ success: false, error: err.message }); }
  });

  socket.on('game-ludo-move', async ({ roomId, tokenIndex }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        await handleLudoMove(rid, socket.user?.id, tokenIndex);
        callback?.({ success: true });
    } catch (err) { callback?.({ success: false, error: err.message }); }
  });

  socket.on('game-sl-roll', async ({ roomId }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        const result = await handleSLRoll(rid, socket.user?.id);
        callback?.({ success: true, ...result });
    } catch (err) { callback?.({ success: false, error: err.message }); }
  });

  socket.on('game-sl-move', async ({ roomId }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        await handleSLMove(rid, socket.user?.id);
        callback?.({ success: true });
    } catch (err) { callback?.({ success: false, error: err.message }); }
  });

  socket.on('game-chess-move', async ({ roomId, move }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        await handleChessMove(rid, socket.user?.id, move);
        callback?.({ success: true });
    } catch (err) { callback?.({ success: false, error: err.message }); }
  });

  socket.on('game-xoxo-move', async ({ roomId, index }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        await handleXOXOMove(rid, socket.user?.id, index);
        callback?.({ success: true });
    } catch (err) { callback?.({ success: false, error: err.message }); }
  });

  socket.on('make-game-move', async ({ roomId, move }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        const room = await getRoom(rid);
        if (!room || !room.gameState || !room.gameState.isActive) {
            return callback?.({ success: false, error: 'No active game' });
        }
        const type = room.gameState.type;
        const userId = socket.user?.id;

        if (type === 'chess') await handleChessMove(rid, userId, move);
        else if (type === 'chess-puzzle') {
            if (move && move.type === 'solve') {
                room.gameState.winner = userId;
                room.gameState.isActive = false;
                if (!room.scores) room.scores = {};
                room.scores[userId] = (room.scores[userId] || 0) + 10;
                await saveRoom(room);
                io.to(rid).emit('game-ended', room.gameState);
                clearTimer(rid);
                return callback?.({ success: true });
            } else if (move && move.type === 'solve-timeout') {
                if (room.gameState.isActive) {
                    room.gameState.winner = 'draw';
                    room.gameState.isActive = false;
                    await saveRoom(room);
                    io.to(rid).emit('game-ended', room.gameState);
                    clearTimer(rid);
                }
                return callback?.({ success: true });
            }
        }
        else if (type === 'xoxo') await handleXOXOMove(rid, userId, move.index);
        else if (type === 'ludo') {
            if (move.type === 'roll') await handleLudoRoll(rid, userId);
            else if (move.type === 'move') await handleLudoMove(rid, userId, move.tokenIndex);
        }
        else if (type === 'snakeladder') {
            if (move.type === 'roll') await handleSLRoll(rid, userId);
            else if (move.type === 'move') await handleSLMove(rid, userId);
        }

        const updatedRoom = await getRoom(rid);
        if (updatedRoom && updatedRoom.gameState && updatedRoom.gameState.timeouts) {
            updatedRoom.gameState.timeouts[userId] = 0;
            await saveRoom(updatedRoom);
        }

        callback?.({ success: true });
    } catch (err) {
        callback?.({ success: false, error: err.message });
    }
  });

  socket.on('end-game', async ({ roomId }) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return;
        const room = await getRoom(rid);
        if (!canControlGame(room)) return;
        room.gameState = { isActive: false };
        room.status = 'LOBBY';
        await saveRoom(room);
        io.to(rid).emit('game-ended', room.gameState);
        io.to(rid).emit('room-status-updated', { status: 'LOBBY' });
        clearTimer(rid);
    } catch (err) { logger.error('End game error:', err); }
  });
}
