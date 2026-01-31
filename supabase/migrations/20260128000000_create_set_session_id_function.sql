-- =====================================================================
-- Migration: Create set_session_id RPC Function
-- =====================================================================
-- Purpose: Provide an RPC function for API endpoints to set the session ID
--          in the PostgreSQL session configuration for use in RLS policies
-- 
-- Function Created:
--   - set_session_id(session_id text) - Sets app.session_id config variable
--
-- Usage:
--   SELECT set_session_id('550e8400-e29b-41d4-a907-ff0000000000');
--
-- Security:
--   - Function runs with SECURITY INVOKER (uses caller's permissions)
--   - No special privileges required
--   - Session setting only lasts for the duration of the connection
--
-- Dependencies: None (standalone function)
-- Schema Version: 1.1.0
-- Created: 2026-01-28
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: set_session_id(session_id text)
-- ---------------------------------------------------------------------
-- Purpose: Set the session ID in PostgreSQL session configuration
-- Usage: Called by API endpoints to establish session context for RLS
-- Parameters:
--   - session_id: UUID v4 string representing the client session
-- Returns: void
-- Security: SECURITY INVOKER (uses caller's permissions)
-- ---------------------------------------------------------------------

create or replace function public.set_session_id(session_id text)
returns void
language plpgsql
security invoker
as $$
begin
  -- Set the session ID in the session configuration
  -- This value can be read in RLS policies using current_setting('app.session_id', true)
  perform set_config('app.session_id', session_id, false);
end;
$$;

comment on function public.set_session_id(text) is 
  'Sets the session ID in PostgreSQL session configuration for RLS policy checks';

-- Grant execute permission to authenticated and anonymous users
grant execute on function public.set_session_id(text) to authenticated, anon;

-- =====================================================================
-- Function Summary
-- =====================================================================
-- Function: public.set_session_id(session_id text)
-- Purpose: Enable session-based RLS by setting configuration variable
-- Security: SECURITY INVOKER (no privilege escalation)
-- Permissions: Granted to authenticated and anon roles
-- 
-- Integration:
--   API endpoints should call this function at the start of each request:
--   
--   const sessionId = request.headers.get("X-Session-ID");
--   await supabase.rpc("set_session_id", { session_id: sessionId });
--
-- RLS Policy Usage:
--   Policies can check the session ID:
--   
--   current_setting('app.session_id', true)
--
-- =====================================================================
