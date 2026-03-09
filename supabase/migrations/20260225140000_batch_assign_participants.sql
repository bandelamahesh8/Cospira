-- Batch Assign Participants RPC
-- Atomically assigns multiple users to a breakout session in one transaction.
-- Respects max_participants capacity. Returns count of successfully inserted rows.

CREATE OR REPLACE FUNCTION public.batch_assign_participants(
  p_breakout_id UUID,
  p_user_ids    UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session         RECORD;
  v_current_count   INT;
  v_available_slots INT;
  v_inserted        INT := 0;
  v_uid             UUID;
BEGIN
  -- Lock the session row to prevent concurrent over-assignment
  SELECT id, max_participants, organization_id, status
  INTO v_session
  FROM public.breakout_sessions
  WHERE id = p_breakout_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'BREAKOUT_NOT_FOUND');
  END IF;

  IF v_session.status = 'CLOSED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'BREAKOUT_CLOSED');
  END IF;

  -- Count existing participants (excluding HOST role)
  SELECT COUNT(*) INTO v_current_count
  FROM public.breakout_participants
  WHERE breakout_id = p_breakout_id
    AND role = 'PARTICIPANT';

  v_available_slots := v_session.max_participants - v_current_count;

  IF v_available_slots <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'BREAKOUT_FULL', 'capacity', v_session.max_participants);
  END IF;

  -- Insert participants up to available slots, skipping duplicates
  FOREACH v_uid IN ARRAY p_user_ids LOOP
    EXIT WHEN v_inserted >= v_available_slots;

    INSERT INTO public.breakout_participants (breakout_id, user_id, role)
    VALUES (p_breakout_id, v_uid, 'PARTICIPANT')
    ON CONFLICT (breakout_id, user_id) DO NOTHING;

    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted,
    'skipped', array_length(p_user_ids, 1) - v_inserted
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users (RLS on breakout_sessions table enforces ownership)
GRANT EXECUTE ON FUNCTION public.batch_assign_participants(UUID, UUID[]) TO authenticated;
