import fs from 'fs';
import path from 'path';
import logger from './shared/logger.js';

/**
 * Deletes files in the specified directory that are older than the max age.
 * @param {string} directory - The directory to clean up.
 * @param {number} maxAgeMs - The maximum age of a file in milliseconds.
 */
export const cleanupUploads = (directory, maxAgeMs) => {
    fs.readdir(directory, (err, files) => {
        if (err) {
            if (err.code === 'ENOENT') return;
            logger.error('Error reading uploads directory for cleanup:', err);
            return;
        }

        const now = Date.now();

        files.forEach(file => {
            const filePath = path.join(directory, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    if (err.code === 'ENOENT') return; // File already deleted
                    logger.error(`Error getting stats for file ${file}:`, err);
                    return;
                }

                if (now - stats.mtimeMs > maxAgeMs) {
                    try {
                        if (stats.isDirectory()) {
                            // Check if directory is old enough
                            fs.rmSync(filePath, { recursive: true, force: true });
                            logger.info(`Deleted old upload directory: ${file}`);
                        } else {
                            fs.unlinkSync(filePath);
                            logger.info(`Deleted old upload file: ${file}`);
                        }
                    } catch (cleanupErr) {
                        // Suppress EPERM/EBUSY on Windows if file is held by another process
                        if (cleanupErr.code === 'EPERM' || cleanupErr.code === 'EBUSY') {
                            logger.debug(`Skipping busy file/dir during cleanup: ${file}`);
                        } else {
                            logger.error(`Error during cleanup for ${file}:`, cleanupErr);
                        }
                    }
                }
            });
        });
    });
};
