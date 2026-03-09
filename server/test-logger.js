import eventLogger from './src/services/EventLogger.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('EventLogger loaded:', !!eventLogger);
process.exit(0);
