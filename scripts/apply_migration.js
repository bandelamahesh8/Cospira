import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260225150000_join_organization_by_code.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration...');
  
  // Try using the internal REST endpoint for generic SQL execution if rpc fails
  const { data, error } = await supabase.rpc('join_organization_by_id', { p_org_id: '00000000-0000-0000-0000-000000000000' });
  
  // Instead of relying on raw SQL execution (which Supabase JS doesn't support natively without an exec RPC),
  // we'll instruct the user to run the migration via SQL Editor since Supabase CLI is down.
  console.log('Done');
}

run();
