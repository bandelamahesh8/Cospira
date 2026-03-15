import eventLogger from './src/services/EventLogger.js';
import dotenv from 'dotenv';
import connectMongoDB from './src/mongo.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const securityDir = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY';
dotenv.config({ path: path.join(securityDir, '.env') });

async function verify() {
  try {
    console.log('Connecting to MongoDB...');
    await connectMongoDB();
    console.log('Connected!');

    const userId = 'system-test-user'; // Or a real ID if known
    console.log(`Fetching activity for: ${userId}`);
    const activity = await eventLogger.getUserGlobalActivity(userId);
    console.log('Result count:', activity.length);
    if (activity.length > 0) {
      console.log('First entry:', activity[0]);
    } else {
       // Let's try to fetch ANY activity to see if the table has data
       console.log('No activity for test user. Checking general activity...');
       const { RoomEvent } = await import('./src/models/RoomEvent.js');
       const anyActivity = await RoomEvent.find().limit(1).lean();
       console.log('Any activity exists:', anyActivity.length > 0);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

verify();
