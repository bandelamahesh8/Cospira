import mongoose from 'mongoose';
import fs from 'fs';
import logger from './logger.js';

const connectMongoDB = async () => {
  if (!process.env.MONGODB_URI) {
    logger.warn('MONGODB_URI not found in environment variables. Skipped MongoDB connection.');
    return;
  }

  try {
    const securityDir = 'C:\\Users\\mahes\\Downloads\\PROJECTS\\COSPIRA_PROJECT\\SECURITY';
    const caPath = `${securityDir}\\ca.pem`;
    const certPath = `${securityDir}\\client-cert.pem`;
    const keyPath = `${securityDir}\\client-key.pem`;

    const options = {
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,
      family: 4 
    };

    if (fs.existsSync(caPath) && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        logger.info('🔒 MongoDB mTLS Enabled — using client certificates');
        options.tls = true;
        options.tlsCAFile = caPath;
        options.tlsCertificateKeyFile = certPath; // Assuming combined cert/key or handled by driver
        // Note: mongoose options for mTLS vary by driver version, 
        // usually passed directly to the MongoClient.
    }
    
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
