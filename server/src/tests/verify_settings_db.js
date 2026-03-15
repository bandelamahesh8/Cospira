import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const securityDir = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY';
dotenv.config({ path: path.join(securityDir, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

async function verifyPersistence() {
    console.log('🚀 Starting MongoDB Settings Verification...');
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // We'll search for recently updated rooms with advanced settings
        const Room = mongoose.model('Room', new mongoose.Schema({
            roomId: String,
            name: String,
            settings: mongoose.Schema.Types.Mixed
        }));

        const recentRooms = await Room.find({}).sort({ updatedAt: -1 }).limit(5);
        
        console.log('\n--- Recent Rooms and their Advanced Settings ---');
        recentRooms.forEach(room => {
            console.log(`\nRoom: ${room.name} (${room.roomId})`);
            console.log(`Settings: ${JSON.stringify(room.settings, null, 2)}`);
        });

        if (recentRooms.length === 0) {
            console.log('\n⚠️ No rooms found in MongoDB.');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error during verification:', err.message);
    }
}

verifyPersistence();
