import logger from '../shared/logger.js';
import eventLogger from '../api/services/EventLogger.js';
import { supabase } from '../shared/supabase.js';

const K_FACTOR = 32;
const DEFAULT_ELO = 1200;

export const handleGameCompletion = async (room) => {
  try {
    const { type, players, winner } = room.gameState;
    const roomId = room.id;
    
    logger.info(`[GAME] Persisting results for room ${roomId}. Winner: ${winner}`);
    
    if (!players || players.length < 2) return;
    const p1 = players[0];
    const p2 = players[1];
    const isDraw = winner === 'draw';

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, elo')
      .in('id', [p1.id, p2.id]);
        
    const elo1 = profiles?.find(p => p.id === p1.id)?.elo || DEFAULT_ELO;
    const elo2 = profiles?.find(p => p.id === p2.id)?.elo || DEFAULT_ELO;
    
    const exp1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
    const exp2 = 1 / (1 + Math.pow(10, (elo1 - elo2) / 400));
    
    let sc1 = 0.5, sc2 = 0.5;
    if (!isDraw) {
      sc1 = winner === p1.id ? 1 : 0;
      sc2 = winner === p2.id ? 1 : 0;
    }
    
    const newElo1 = Math.round(elo1 + K_FACTOR * (sc1 - exp1));
    const newElo2 = Math.round(elo2 + K_FACTOR * (sc2 - exp2));
    
    await Promise.all([
      supabase.from('profiles').update({ elo: newElo1 }).eq('id', p1.id),
      supabase.from('profiles').update({ elo: newElo2 }).eq('id', p2.id)
    ]);
    
    await supabase.from('game_stats').insert({
      room_id: roomId,
      game_type: type,
      player1_id: p1.id,
      player2_id: p2.id,
      winner_id: isDraw ? null : winner,
      is_draw: isDraw,
      elo_change_p1: newElo1 - elo1,
      elo_change_p2: newElo2 - elo2,
      duration_seconds: Math.floor((Date.now() - (room.gameState.startTime || Date.now())) / 1000)
    });
    
    eventLogger.logGameEnded(roomId, winner, type);
  } catch (err) {
    logger.error('[GAME] Persistence error:', err);
  }
};
