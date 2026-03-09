ALTER TABLE organizations 
ADD COLUMN mode text NOT NULL DEFAULT 'FUN' 
CHECK (mode IN ('FUN', 'PROF', 'ULTRA_SECURE', 'MIXED'));

CREATE TABLE breakout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  host_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'LIVE', 'CLOSED')),
  mode_override text CHECK (mode_override IN ('FUN', 'PROF', 'ULTRA_SECURE')),
  max_participants integer NOT NULL DEFAULT 20,
  created_at timestamptz DEFAULT now()
);


CREATE TABLE breakout_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breakout_id uuid NOT NULL REFERENCES breakout_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'PARTICIPANT' CHECK (role IN ('HOST', 'PARTICIPANT')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE (breakout_id, user_id)
);

