import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from './logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fix for SELF_SIGNED_CERT_IN_CHAIN errors in certain development environments
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('Supabase URL or Service Role Key missing. Supabase integration will be disabled.');
} else {
  logger.info('✅ Supabase client initialized successfully');
}

export const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;
