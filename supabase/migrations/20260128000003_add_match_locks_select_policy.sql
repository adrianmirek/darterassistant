-- =====================================================================
-- Migration: Add SELECT policy for match_locks
-- =====================================================================
-- Purpose: Allow anonymous users to view lock status
-- 
-- Issue: Lock insert with .select() was failing because no SELECT policy
--        existed for anon users on match_locks table
--
-- Created: 2026-01-28
-- =====================================================================

-- Drop if exists
drop policy if exists "match_locks_select_anon" on topdarter.match_locks;

-- Policy: Allow anonymous users to SELECT match locks
create policy "match_locks_select_anon"
  on topdarter.match_locks
  for select
  to anon
  using (true); -- Allow viewing all locks (needed for conflict detection)

comment on policy "match_locks_select_anon" on topdarter.match_locks is
  'Anonymous users can view lock status for conflict detection';
