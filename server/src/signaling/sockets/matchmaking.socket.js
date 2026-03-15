import { matchmakingService } from '../services/MatchmakingService.js';
import { createClient } from '@supabase/supabase-js';
import { saveRoom, getRoom } from '../../shared/redis.js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);


/**
 * Matchmaking Socket Events
 * 
 * Handles player queue management and match creation.
 */
export default (io, socket) => {
  /**
   * Join matchmaking queue
   */
  socket.on('join-matchmaking', async (data) => {
    try {
      const { gameType, mode } = data;
      const user = socket.user;

      if (!user) {
        socket.emit('matchmaking-error', { message: 'Not authenticated' });
        return;
      }

      // Get player's ELO and Behavior Score
      const { data: profile } = await supabase
        .from('player_profiles')
        .select('behavior_score')
        .eq('id', user.id)
        .single();
        
      const { data: stats } = await supabase
        .from('game_stats')
        .select('elo')
        .eq('player_id', user.id)
        .eq('game_type', gameType)
        .single();

      const elo = stats?.elo || 1000;
      const behaviorScore = profile?.behavior_score || 100;
      const userPing = data.ping || 50; // Client should send this

      // Join queue
      const match = matchmakingService.joinQueue({
        playerId: user.id,
        playerName: user.name || user.email?.split('@')[0] || 'Player',
        gameType,
        mode,
        elo,
        behaviorScore,
        ping: userPing,
        joinedAt: Date.now(),
        socketId: socket.id,
      });
      
      if (match) {
          const roomId = `match-${match.id}`;
          
          // Create the room programmatically
          const roomData = {
              id: roomId,
              name: `${gameType.toUpperCase()} Match`,
              hostId: match.players[0].playerId, // Assign first player as host for logic purposes
              createdAt: new Date().toISOString(),
              status: 'live',
              accessType: 'public',
              users: {},
              messages: [],
              files: [],
              isMatch: true,
              gameType: match.gameType,
              mode: match.mode
          };
          
          await saveRoom(roomData);

          // Notify both players with the ROOM ID
          match.players.forEach(p => {
              io.to(p.socketId).emit('match-found', {
                  matchId: match.id,
                  roomId: roomId, // CRITICAL: Client needs roomId to navigate
                  opponent: match.players.find(op => op.playerId !== p.playerId),
                  gameType: match.gameType,
                  mode: match.mode
              });
          });
      }

      socket.emit('queue-joined', {
        gameType,
        mode,
        elo,
        estimatedWait: mode === 'casual' ? 5 : 30,
      });

      console.log(`🎮 ${user.name} joined ${gameType} ${mode} queue (ELO: ${elo})`);
    } catch (error) {
      console.error('Error joining matchmaking:', error);
      socket.emit('matchmaking-error', { message: 'Failed to join queue' });
    }
  });

  /**
   * Leave matchmaking queue
   */
  socket.on('leave-matchmaking', () => {
    try {
      const user = socket.user;
      if (!user) return;

      matchmakingService.leaveQueue(user.id);
      socket.emit('queue-left');

      console.log(`👋 ${user.name} left matchmaking queue`);
    } catch (error) {
      console.error('Error leaving matchmaking:', error);
    }
  });

  /**
   * Get queue status
   */
  socket.on('get-queue-status', (data) => {
    try {
      const { gameType, mode } = data;
      const user = socket.user;

      if (!user) return;

      const status = matchmakingService.getQueueStatus(user.id, gameType, mode);
      socket.emit('queue-status', status);
    } catch (error) {
      console.error('Error getting queue status:', error);
    }
  });

  /**
   * On disconnect, remove from queue
   */
  socket.on('disconnect', () => {
    try {
      const user = socket.user;
      if (user) {
        matchmakingService.leaveQueue(user.id);
      }
    } catch (error) {
      console.error('Error on disconnect:', error);
    }
  });
};
