-- Fixed version: Create acquire_lock function
-- Run this in Supabase Studio SQL Editor: http://localhost:54323

DROP FUNCTION IF EXISTS public.acquire_lock(uuid, varchar, jsonb, boolean, int);

CREATE OR REPLACE FUNCTION public.acquire_lock(
  p_match_id uuid,
  p_session_id varchar(255),
  p_device_info jsonb DEFAULT '{}'::jsonb,
  p_auto_extend boolean DEFAULT true,
  p_expires_in_seconds int DEFAULT 300
)
RETURNS TABLE (
  match_id uuid,
  locked_by_session_id varchar(255),
  device_info jsonb,
  locked_at timestamptz,
  expires_at timestamptz,
  auto_extend boolean,
  last_activity_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = topdarter, public
AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  v_expires_at := now() + (p_expires_in_seconds || ' seconds')::interval;
  
  -- Check if match is locked by a different session
  IF EXISTS (
    SELECT 1 FROM topdarter.match_locks ml
    WHERE ml.match_id = p_match_id
      AND ml.locked_by_session_id != p_session_id
      AND ml.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Match is locked by another session'
      USING errcode = 'LOCKC', hint = 'LOCK_CONFLICT';
  END IF;
  
  -- Delete any existing locks for this session
  -- Use EXECUTE to avoid column name ambiguity with RETURNS TABLE
  EXECUTE format('DELETE FROM topdarter.match_locks WHERE locked_by_session_id = %L', p_session_id);
  
  -- Insert new lock
  RETURN QUERY
  INSERT INTO topdarter.match_locks (
    match_id, locked_by_session_id, device_info, locked_at, expires_at,
    auto_extend, last_activity_at, created_at, updated_at
  )
  VALUES (
    p_match_id, p_session_id, p_device_info, now(), v_expires_at,
    p_auto_extend, now(), now(), now()
  )
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acquire_lock TO anon, authenticated;
