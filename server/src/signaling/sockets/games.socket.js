import logger from '../../shared/logger.js';
import eventLogger from '../services/EventLogger.js';
import { getRoom, saveRoom } from '../../shared/redis.js';
import { sanitizeRoomId } from '../utils/sanitize.js';
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
        
        const players = room.gameState.players;
        const currentIndex = players.findIndex(p => p.id === playerId);
        const nextIndex = (currentIndex + 1) % players.length;
        room.gameState.turn = players[nextIndex].id;

        room.gameState.turnStartTime = Date.now();
        await saveRoom(room);
        io.to(roomId).emit('game-move', room.gameState);
        startTimer(roomId, room.gameState.turn);
    } catch (err) {
        logger.error(`Error in handleTimeout for room ${roomId}:`, err);
    }
  };

  // --- INTERNAL HANDLERS ---

  const handleSLRoll = async (roomId, userId) => {
    try {
        const room = await getRoom(roomId);
        if (!room || room.gameState?.currentTurn !== userId) throw new Error('Not your turn');

        const engine = new SnakeLadderEngine(room.gameState.players, room.gameState.board);
        Object.assign(engine, room.gameState);

        const result = engine.rollDice(userId);
        if (result.error) throw new Error(result.error);

        room.gameState = { ...room.gameState, ...engine.getState() };
        await saveRoom(room);
        io.to(roomId).emit('game-move', room.gameState);
        return { rolled: result.rolled };
    } catch (err) {
        logger.error(`Error in handleSLRoll for room ${roomId}:`, err);
        throw err;
    }
  };

  const handleSLMove = async (roomId, userId) => {
    try {
        const room = await getRoom(roomId);
        if (!room || room.gameState?.currentTurn !== userId) throw new Error('Not your turn');

        const engine = new SnakeLadderEngine(room.gameState.players, room.gameState.board);
        Object.assign(engine, room.gameState);

        const result = engine.moveToken(userId);
        if (result.error) throw new Error(result.error);

        room.gameState = { ...room.gameState, ...engine.getState() };
        await saveRoom(room);
        io.to(roomId).emit('game-move', room.gameState);

        if (room.gameState.winner) {
            io.to(roomId).emit('game-ended', room.gameState);
            clearTimer(roomId);
        } else {
            startTimer(roomId, room.gameState.currentTurn);
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

  socket.on('start-game', async ({ roomId, type, players, config }, callback) => {
    try {
      const rid = sanitizeRoomId(roomId);
      if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
      const room = await getRoom(rid);
      if (!canControlGame(room)) return callback?.({ success: false, error: 'Only host or co-host can start games' });
      const memberCount = room.users ? Object.keys(room.users).length : 0;
      if (memberCount < 2) return callback?.({ success: false, error: 'Minimum 2 members in room required' });
      const maxPlayers = { chess: 2, 'chess-puzzle': 2, xoxo: 2, snakeladder: 4, ludo: 4, 'ultimate-xoxo': 2, connect4: 2, checkers: 2 }[type] ?? 2;
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

      if (type === 'snakeladder') {
         const slPlayers = players.map((id, idx) => {
            const userObj = room.users && Object.values(room.users).find(u => u.id === id);
            return {
                id,
                name: userObj?.name || 'Player ' + (idx + 1),
                color: ['red', 'blue', 'green', 'yellow'][idx % 4],
                pos: 0,
                consecutiveSixes: 0
            };
        });
        const engine = new SnakeLadderEngine(slPlayers);
        gameState = { ...gameState, ...engine.getState() };
        gameState.turn = slPlayers[0].id; // Compatibility
        gameState.currentTurn = slPlayers[0].id;
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
      } else if (type === 'ludo') {
        gameState.version = 3;
        gameState.hostId = players[0];
        gameState.currentTurn = players[0];
        gameState.turnDeadlineTs = Date.now() + 30000;
        gameState.diceValue = 0;
        gameState.diceRolled = false;
        gameState.tokens = {
          red: [-1, -1, -1, -1],
          blue: [-1, -1, -1, -1],
          green: [-1, -1, -1, -1],
          yellow: [-1, -1, -1, -1]
        };
        gameState.players = players.map((id, idx) => {
          const userObj = room.users && Object.values(room.users).find(u => u.id === id);
          return { 
            id, 
            name: userObj?.name || 'Player ' + (idx + 1), 
            color: ['red', 'blue', 'green', 'yellow'][idx % 4],
            connected: true
          };
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

  socket.on('game-ludo-action', async ({ roomId, action }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        
        // Broadcast action to everyone (especially the host)
        io.to(rid).emit('game-ludo-action-received', { action, senderId: socket.user?.id });
        callback?.({ success: true });
    } catch (err) { callback?.({ success: false, error: err.message }); }
  });

  socket.on('game-ludo-state-update', async ({ roomId, newState }, callback) => {
    try {
        const rid = sanitizeRoomId(roomId);
        if (!rid) return callback?.({ success: false, error: 'Invalid room id' });
        const room = await getRoom(rid);
        
        // Only allow the current host to update the state
        if (room.gameState && room.gameState.hostId === socket.user?.id) {
            room.gameState = { ...room.gameState, ...newState };
            await saveRoom(room);
            io.to(rid).emit('game-move', room.gameState); // Broadcast to all
            callback?.({ success: true });
        } else {
            callback?.({ success: false, error: 'Not the host' });
        }
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
        else if (type === 'snakeladder') {
            if (move.type === 'roll') await handleSLRoll(rid, userId);
            else if (move.type === 'move') await handleSLMove(rid, userId);
        } else if (type === 'connect4') {
            // PHASE 7: Host Authoritative Model
            // Server proxies move requests; host will apply and update state
            io.to(rid).emit('game-action-request', { 
                game: 'connect4', 
                action: 'MOVE', 
                payload: move, 
                senderId: userId,
                timestamp: Date.now() 
            });
            
            // Phase 11: Observability
            eventLogger.logGameActivity(rid, userId, 'move_applied', { type: 'connect4', column: move.col });
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
