import mongoose from 'mongoose';
import logger from './logger.js';

const connectMongoDB = async () => {
  if (!process.env.MONGODB_URI) {
    logger.warn('MONGODB_URI not found in environment variables. Skipped MongoDB connection.');
    return;
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // Fail after 5s if no server found
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    logger.info('Connected to MongoDB');
    
    mongoose.connection.on('error', (err) => {
        logger.error('MongoDB Runtime Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB Disconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Don't exit process, just log error, as Supabase is the main source of truth
  }
};

export default connectMongoDB;
