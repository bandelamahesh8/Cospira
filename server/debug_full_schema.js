import { supabase } from './src/supabase.js';

async function inspectTable(tableName) {
    if (!supabase) return;
    console.log(`\n--- Inspecting Table: ${tableName} ---`);
    
    // Attempt to select * from one row
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    
    if (error) {
        console.error(`Error querying ${tableName}:`, JSON.stringify(error, null, 2));
    } else {
        if (data.length === 0) {
            console.log(`Table ${tableName} is empty. Attempting insert dry-run to check schema...`);
            // We can't really "dry run" insert easily without writing data, 
            // but we can try to select specific common columns to see if they error.
            await checkColumnBase(tableName);
        } else {
            console.log(`Available columns in ${tableName}:`, Object.keys(data[0]).join(', '));
        }
    }
}

async function checkColumnBase(tableName) {
    const candidateColumns = ['id', 'name', 'title', 'created_at', 'owner_id', 'is_private', 'room_type'];
    for (const col of candidateColumns) {
        const { error } = await supabase.from(tableName).select(col).limit(1);
        if (error) {
            // console.log(`[ ] Column '${col}' does NOT exist (or error: ${error.message})`);
        } else {
            console.log(`[x] Column '${col}' EXISTS`);
        }
    }
}

async function run() {
    await inspectTable('rooms');
    await inspectTable('room_members');
    await inspectTable('users');
}

run();
