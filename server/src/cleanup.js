import fs from 'fs';
import path from 'path';
import logger from './logger.js';

/**
 * Deletes files in the specified directory that are older than the max age.
 * @param {string} directory - The directory to clean up.
 * @param {number} maxAgeMs - The maximum age of a file in milliseconds.
 */
export const cleanupUploads = (directory, maxAgeMs) => {
    fs.readdir(directory, (err, files) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Directory doesn't exist yet, which is fine
                return;
            }
            logger.error('Error reading uploads directory for cleanup:', err);
            return;
        }

        const now = Date.now();

        files.forEach(file => {
            const filePath = path.join(directory, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    logger.error(`Error getting stats for file ${file}:`, err);
                    return;
                }

                if (now - stats.mtimeMs > maxAgeMs) {
                    fs.unlink(filePath, err => {
                        if (err) {
                            logger.error(`Error deleting file ${file}:`, err);
                        } else {
                            logger.info(`Deleted old upload: ${file}`);
                        }
                    });
                }
            });
        });
    });
};
