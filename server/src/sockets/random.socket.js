
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';

// Simple in-memory queue for prototype (Phase 1)
// In production, use Redis List/Set
const matchingQueue = {
    video: [],
    text: []
};

// Handle users currently in a match to prevent double queueing
const activeMatches = new Map(); // userId -> roomId

export default function registerRandomHandlers(io, socket) {
    
    // --- Join Queue ---
    socket.on('join_random_queue', ({ mode = 'video', interests = [], autoSkip = false }) => {
        const userId = socket.user?.id || socket.id;
        const targetQueue = mode === 'text' ? matchingQueue.text : matchingQueue.video;

        // 1. Remove from any existing queue first
        removeFromQueue(userId);

        // 2. Try to find a match immediately
        const matchIndex = targetQueue.findIndex(user => user.socketId !== socket.id); // Allow self-match (different socket) for easier multi-device testing

        if (matchIndex !== -1) {
            // MATCH FOUND!
            const partner = targetQueue.splice(matchIndex, 1)[0];
            const roomId = `cnt-${uuidv4().substring(0, 8)}`; // "cnt-" prefix for Connect Rooms

            // Notify both users
            const matchData = { roomId, mode, interests };
            
            // Partner
            io.to(partner.socketId).emit('match_found', matchData);
            // Self
            socket.emit('match_found', matchData);

            // Join them to the room socket-wise (handled by client join_room, but we can pre-empt)
            // Ideally, client receives 'match_found' and emits 'join_room'
            
            logger.info(`[RandomMatch] Matched ${userId} with ${partner.userId} in ${roomId}`);
        } else {
            // NO MATCH, ADD TO QUEUE
            targetQueue.push({
                userId,
                socketId: socket.id,
                interests,
                timestamp: Date.now()
            });
            // socket.emit('queue_joined', { mode });
            logger.info(`[RandomMatch] User ${userId} joined ${mode} queue. Size: ${targetQueue.length}`);
        }
    });

    // --- Leave Queue ---
    socket.on('leave_queue', () => {
        const userId = socket.user?.id || socket.id;
        removeFromQueue(userId);
    });

    // --- Skip User (Next) ---
    socket.on('skip_user', ({ mode, interests }) => {
        // Same as join_random_queue but functionally explicit
        // The client will usually emit leave_room then join_random_queue
        // But if they want to speed-skip:
        const userId = socket.user?.id || socket.id;
        
        // Ensure they are out of the old room (handled by client leave)
        // Re-add to queue
        // We can just reuse the handler logic by re-emitting locally or calling a shared function
        // For simplicity, we assume client calls join_random_queue immediately after this
    });

    // --- Disconnect Helper ---
    socket.on('disconnect', () => {
        const userId = socket.user?.id || socket.id;
        removeFromQueue(userId);
    });

    function removeFromQueue(userId) {
        matchingQueue.video = matchingQueue.video.filter(u => u.userId !== userId);
        matchingQueue.text = matchingQueue.text.filter(u => u.userId !== userId);
    }
}
