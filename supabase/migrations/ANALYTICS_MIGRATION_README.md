# Analytics Tables Migration

## Overview

This migration creates the database tables required for real-time analytics in the Intel dashboard.

## Tables Created

### 1. `rooms`

Tracks all created rooms for analytics purposes.

**Columns:**

- `id` (TEXT, PK) - Room identifier
- `name` (TEXT) - Room name
- `host_id` (UUID, FK) - References auth.users
- `mode` (TEXT) - Room mode: 'fun', 'professional', 'ultra', 'mixed'
- `access_type` (TEXT) - Access type: 'public', 'password', 'invite', 'organization'
- `organization_id` (UUID, FK) - References organizations (optional)
- `participant_count` (INTEGER) - Current number of participants
- `is_active` (BOOLEAN) - Whether room is currently active
- `created_at` (TIMESTAMPTZ) - Room creation timestamp
- `ended_at` (TIMESTAMPTZ) - Room end timestamp

### 2. `room_sessions`

Tracks user participation in rooms for analytics.

**Columns:**

- `id` (UUID, PK) - Session identifier
- `user_id` (UUID, FK) - References auth.users
- `room_id` (TEXT, FK) - References rooms
- `room_mode` (TEXT) - Mode of the room during this session
- `joined_at` (TIMESTAMPTZ) - When user joined
- `left_at` (TIMESTAMPTZ) - When user left
- `duration_seconds` (INTEGER) - Auto-calculated session duration
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

## Features

### Automatic Duration Calculation

When a user leaves a room (`left_at` is set), the `duration_seconds` is automatically calculated using a trigger.

### Automatic Participant Count

The `participant_count` in the `rooms` table is automatically updated when users join or leave.

### Row Level Security (RLS)

Both tables have RLS enabled with policies:

- Users can view active rooms
- Users can create/update/delete their own rooms
- Users can view/create/update their own sessions

### Indexes

Optimized indexes on frequently queried columns for better performance.

## How to Apply

### Option 1: Supabase CLI

```bash
supabase db push
```

### Option 2: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `20260126000000_analytics_tables.sql`
4. Paste and run the SQL

### Option 3: Direct SQL Execution

```bash
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20260126000000_analytics_tables.sql
```

## Integration

Once the migration is applied, the `RoomAnalyticsService` will automatically start fetching real data:

- **Total Rooms Created** - Count from `rooms` table
- **Total Time Spent** - Sum of `duration_seconds` from `room_sessions`
- **Security Clearance** - Calculated from Ultra mode sessions
- **Time in Ultra** - Sum of `duration_seconds` where `room_mode = 'ultra'`

## Next Steps

After applying the migration, you need to integrate session tracking into your WebSocket handlers:

1. **On Room Creation:**

   ```typescript
   await supabase.from('rooms').insert({
     id: roomId,
     name: roomName,
     host_id: userId,
     mode: roomMode,
     access_type: accessType,
   });
   ```

2. **On User Join:**

   ```typescript
   await supabase.from('room_sessions').insert({
     user_id: userId,
     room_id: roomId,
     room_mode: roomMode,
     joined_at: new Date().toISOString(),
   });
   ```

3. **On User Leave:**
   ```typescript
   await supabase
     .from('room_sessions')
     .update({ left_at: new Date().toISOString() })
     .eq('user_id', userId)
     .eq('room_id', roomId)
     .is('left_at', null);
   ```

The `duration_seconds` will be calculated automatically by the trigger!

## Verification

After applying the migration, verify the tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rooms', 'room_sessions');
```

Check the triggers:

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('rooms', 'room_sessions');
```
