import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger.js';
import { supabase } from '../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');

/**
 * Deletes all uploaded files associated with a specific room from both local storage and Supabase Cloud.
 * @param {string} roomId 
 */
export const deleteRoomUploads = async (roomId) => {
    if (!roomId) return;
    
    // Sanitize roomId to prevent directory traversal
    const safeRoomId = roomId.replace(/[^a-zA-Z0-9-_]/g, '');
    
    // 1. Local Filesystem Cleanup
    const roomDir = path.join(UPLOAD_BASE_DIR, safeRoomId);
    try {
        if (fs.existsSync(roomDir)) {
            logger.info(`[Cleanup] Deleting local assets for room ${roomId} at ${roomDir}`);
            fs.rmSync(roomDir, { recursive: true, force: true });
        }
    } catch (error) {
        logger.error(`[Cleanup] Local asset deletion failed for room ${roomId}:`, error);
    }

    // 2. Supabase Storage Cleanup
    if (!supabase) return;

    try {
        // List all assets in the room's cloud folder
        const { data: files, error: listError } = await supabase.storage
            .from('cospira-media')
            .list(safeRoomId);

        if (listError) {
            logger.warn(`[Cleanup] Supabase list failed for ${roomId}:`, listError.message);
            return;
        }

        if (files && files.length > 0) {
            const filesToRemove = files.map(f => `${safeRoomId}/${f.name}`);
            const { error: removeError } = await supabase.storage
                .from('cospira-media')
                .remove(filesToRemove);

            if (removeError) {
                logger.error(`[Cleanup] Supabase cloud purge failed for ${roomId}:`, removeError);
            } else {
                logger.info(`[Cleanup] Purged ${files.length} cloud assets from Supabase for room ${roomId}`);
            }
        }
    } catch (err) {
        logger.error(`[Cleanup] Severe cloud cleanup failure for ${roomId}:`, err);
    }
};
