import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import KartSession from '../models/KartSession.js';
import KartResult from '../models/KartResult.js';
import KartCheckpoint from '../models/KartCheckpoint.js';
import KartIdentityMap from '../models/KartIdentityMap.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply auth to all game routes
router.use(authenticateToken);

// Helper to get UGS access token
async function getUGSAccessToken() {
  const response = await axios.post('https://services.api.unity.com/auth/v1/token-exchange', {
    grant_type: 'client_credentials',
    client_id: process.env.UGS_SERVICE_ACCOUNT_KEY_ID,
    client_secret: process.env.UGS_SERVICE_ACCOUNT_SECRET_KEY,
  });
  return response.data.access_token;
}

// POST /api/game/start
router.post('/start', async (req, res) => {
  try {
    const { roomId, game, trackId, maxPlayers, players } = req.body;
    if (game !== 'kart-race') return res.status(400).json({ error: 'Unsupported game' });

    // Assume req.user is set by auth middleware
    const hostUserId = req.user.id; // Need to check if host

    // Get UGS token
    const token = await getUGSAccessToken();

    // Create Relay allocation
    const relayResponse = await axios.post(
      `https://relay.services.api.unity.com/v1/projects/${process.env.UGS_PROJECT_ID}/allocations`,
      {
        allocationId: uuidv4(),
        maxConnections: maxPlayers,
        region: 'us-east-1', // or dynamic
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const allocationId = relayResponse.data.allocationId;

    // Get join code
    const joinCodeResponse = await axios.get(
      `https://relay.services.api.unity.com/v1/projects/${process.env.UGS_PROJECT_ID}/allocations/${allocationId}/join-code`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const joinCode = joinCodeResponse.data.joinCode;

    // Create session
    const sessionId = `kart_${uuidv4()}`;
    const session = new KartSession({
      sessionId,
      roomId,
      joinCode,
      hostUserId,
      trackId,
      maxPlayers,
    });
    await session.save();

    // Broadcast joinCode via WebSocket (assume socket.io is available)
    // req.io.to(roomId).emit('game-start', { joinCode, sessionId });

    res.json({
      gameSessionId: sessionId,
      joinCode,
      hostUserId,
      expiresAt: new Date(Date.now() + parseInt(process.env.KART_JOIN_CODE_EXPIRY_SECONDS) * 1000).toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start game' });
  }
});

// POST /api/game/results
router.post('/results', async (req, res) => {
  try {
    const { sessionId, results } = req.body;
    const session = await KartSession.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Validate results
    const trackCheckpoints = parseInt(process.env[`KART_CHECKPOINT_COUNT_${session.trackId.toUpperCase()}`]);
    const minLapTime = parseInt(process.env[`KART_MIN_LAP_TIME_MS_${session.trackId.toUpperCase()}`]);

    for (const result of results) {
      if (result.checkpointsHit !== trackCheckpoints) return res.status(400).json({ error: 'Invalid checkpoint count' });
      if (result.bestLapMs < minLapTime) return res.status(400).json({ error: 'Invalid lap time' });
    }

    // Sort by totalTimeMs
    results.sort((a, b) => a.totalTimeMs - b.totalTimeMs);
    results.forEach((r, i) => r.position = i + 1);

    // Save results
    for (const result of results) {
      const kartResult = new KartResult({
        sessionId,
        userId: result.userId,
        position: result.position,
        bestLapMs: result.bestLapMs,
        totalTimeMs: result.totalTimeMs,
        checkpointsHit: result.checkpointsHit,
      });
      await kartResult.save();
    }

    session.status = 'completed';
    session.endedAt = new Date();
    await session.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

// POST /api/game/checkpoint
router.post('/checkpoint', async (req, res) => {
  try {
    const { sessionId, userId, checkpointIndex, timestampMs, sequenceHash } = req.body;

    const checkpoint = new KartCheckpoint({
      sessionId,
      userId,
      checkpointIndex,
      timestampMs,
      sequenceHash,
    });
    await checkpoint.save();

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save checkpoint' });
  }
});

export default router;