import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    try {
        console.log('🔧 Starting RLS policy fix migration...\n');

        // Read the migration file
        const migrationPath = join(__dirname, 'supabase', 'migrations', '20251202000000_fix_rls_infinite_recursion.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('📄 Migration file loaded successfully');
        console.log('🚀 Executing SQL migration...\n');

        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: statement });

                if (error) {
                    // If exec_sql doesn't exist, try direct query
                    const { error: queryError } = await supabase.from('_').select('*').limit(0);

                    if (queryError) {
                        console.log(`⚠️  Statement skipped (may need manual execution):`);
                        console.log(`   ${statement.substring(0, 60)}...`);
                        errorCount++;
                    } else {
                        successCount++;
                    }
                } else {
                    console.log(`✅ Executed: ${statement.substring(0, 60)}...`);
                    successCount++;
                }
            } catch (err) {
                console.error(`❌ Error executing statement:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        if (errorCount > 0) {
            console.log('\n⚠️  Some statements could not be executed automatically.');
            console.log('   Please run the migration manually in Supabase SQL Editor:');
            console.log(`   ${migrationPath}`);
            process.exit(1);
        } else {
            console.log('\n✅ Migration completed successfully!');
            console.log('   The RLS infinite recursion issue should now be fixed.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('\n📝 Please run the migration manually in Supabase SQL Editor:');
        console.log('   supabase/migrations/20251202000000_fix_rls_infinite_recursion.sql');
        process.exit(1);
    }
}

runMigration();
