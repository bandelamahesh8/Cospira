
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
);

async function testQuery() {
  const orgId = 'SOME_ORG_ID'; // We need a real orgId to test, but let's see if the query structure is even valid
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      player_profiles (
        display_name,
        avatar_url,
        id
      ),
      organization_roles (
        name
      )
    `)
    .limit(1);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Success:', data);
  }
}

testQuery();
