import logger from '../../shared/logger.js';
import { getRoom, deleteRoom, getActiveRooms } from '../../shared/redis.js';
import eventLogger from './EventLogger.js';
import { deleteRoomUploads } from '../../utils/fileCleanup.js';

class AutoCloseService {
    constructor() {
        this.interval = null;
    }

    start(io) {
        if (this.interval) return;
        
        logger.info('[AutoClose] Service started');
        this.interval = setInterval(() => this.checkRooms(io), 60000); // Check every minute
    }

    async checkRooms(io) {
        try {
            const rooms = await getActiveRooms();
            const now = new Date();

            for (const room of rooms) {
                const autoCloseMinutes = room.settings?.auto_close_minutes;
                if (!autoCloseMinutes || autoCloseMinutes <= 0) continue;

                const createdAt = room.createdAt ? new Date(room.createdAt) : now;
                const expirationTime = new Date(createdAt.getTime() + autoCloseMinutes * 60000);

                if (now >= expirationTime) {
                    logger.info(`[AutoClose] Closing room ${room.id} after ${autoCloseMinutes} minutes`);
                    
                    // Notify users
                    io.to(room.id).emit('room-disbanded', { 
                        roomId: room.id, 
                        reason: 'auto_closed',
                        message: `Room automatically closed after ${autoCloseMinutes} minutes.`
                    });

                    // Cleanup
                    await deleteRoom(room.id);
                    await eventLogger.logRoomDeleted(room.id, 'system-autoclose', room.name);
                    await deleteRoomUploads(room.id);
                }
            }
        } catch (error) {
            logger.error(`[AutoClose] Error: ${error.message}`);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

export default new AutoCloseService();
