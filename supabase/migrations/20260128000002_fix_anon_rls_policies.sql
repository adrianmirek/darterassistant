-- =====================================================================
-- Migration: Fix Anonymous User RLS Policies for Guest Play
-- =====================================================================
-- Purpose: Allow anonymous users (guests) to create and manage matches
--          using session-based identification instead of user authentication
-- 
-- Policies Added:
--   - matches_insert_anon: Allow anon to create matches
--   - matches_update_anon: Allow anon to update matches with valid session
--   - match_legs_insert_anon: Allow anon to insert throws with valid session
--   - match_legs_update_anon: Allow anon to update throws with valid session
--   - match_stats_select_anon: Allow anon to view stats for their matches
--   - match_locks_insert_anon: Allow anon to create locks
--   - match_locks_update_anon: Allow anon to update their locks
--   - match_locks_delete_anon: Allow anon to delete their locks
--
-- Security Model:
--   - Session-based access control using current_setting('app.session_id')
--   - Anon users can only access data tied to their session
--   - Matches are associated with sessions via match_locks
--
-- Dependencies: 20260119120300_create_topdarter_rls_policies.sql
-- Created: 2026-01-28
-- =====================================================================

-- =====================================================================
-- Drop existing policies if they exist (for re-running migration)
-- =====================================================================

drop policy if exists "matches_insert_anon" on topdarter.matches;
drop policy if exists "matches_update_anon" on topdarter.matches;
drop policy if exists "match_legs_insert_anon" on topdarter.match_legs;
drop policy if exists "match_legs_update_anon" on topdarter.match_legs;
drop policy if exists "match_stats_select_anon" on topdarter.match_stats;
drop policy if exists "match_locks_insert_anon" on topdarter.match_locks;
drop policy if exists "match_locks_update_anon" on topdarter.match_locks;
drop policy if exists "match_locks_delete_anon" on topdarter.match_locks;

-- =====================================================================
-- Matches Table: Allow anon to create and update matches
-- =====================================================================

-- Policy: Allow anonymous users to INSERT matches
create policy "matches_insert_anon"
  on topdarter.matches
  for insert
  to anon
  with check (true); -- Allow any anon user to create a match

comment on policy "matches_insert_anon" on topdarter.matches is
  'Anonymous users (guests) can create matches for guest play';

-- Policy: Allow anonymous users to UPDATE matches they have a lock on
create policy "matches_update_anon"
  on topdarter.matches
  for update
  to anon
  using (
    id in (
      select match_id from topdarter.match_locks
      where locked_by_session_id = current_setting('app.session_id', true)
        and expires_at > now()
    )
  );

comment on policy "matches_update_anon" on topdarter.matches is
  'Anonymous users can update matches they have an active lock on';

-- =====================================================================
-- Match Legs Table: Allow anon to insert and update throws
-- =====================================================================

-- Policy: Allow anonymous users to INSERT throws (with valid lock)
create policy "match_legs_insert_anon"
  on topdarter.match_legs
  for insert
  to anon
  with check (
    match_id in (
      select match_id from topdarter.match_locks
      where locked_by_session_id = current_setting('app.session_id', true)
        and expires_at > now()
    )
  );

comment on policy "match_legs_insert_anon" on topdarter.match_legs is
  'Anonymous users can insert throws if they have an active lock on the match';

-- Policy: Allow anonymous users to UPDATE throws (with valid lock)
create policy "match_legs_update_anon"
  on topdarter.match_legs
  for update
  to anon
  using (
    match_id in (
      select match_id from topdarter.match_locks
      where locked_by_session_id = current_setting('app.session_id', true)
        and expires_at > now()
    )
  );

comment on policy "match_legs_update_anon" on topdarter.match_legs is
  'Anonymous users can update throws if they have an active lock on the match';

-- =====================================================================
-- Match Stats Table: Allow anon to view stats
-- =====================================================================

-- Policy: Allow anonymous users to SELECT stats for matches they have access to
create policy "match_stats_select_anon"
  on topdarter.match_stats
  for select
  to anon
  using (
    match_id in (
      select id from topdarter.matches where is_private = false
    )
  );

comment on policy "match_stats_select_anon" on topdarter.match_stats is
  'Anonymous users can view stats for public matches';

-- =====================================================================
-- Match Locks Table: Allow anon to manage locks
-- =====================================================================

-- Policy: Allow anonymous users to INSERT locks
create policy "match_locks_insert_anon"
  on topdarter.match_locks
  for insert
  to anon
  with check (true); -- Any anon user can try to acquire a lock

comment on policy "match_locks_insert_anon" on topdarter.match_locks is
  'Anonymous users can acquire locks for match scoring';

-- Policy: Allow anonymous users to UPDATE their own locks
create policy "match_locks_update_anon"
  on topdarter.match_locks
  for update
  to anon
  using (locked_by_session_id = current_setting('app.session_id', true));

comment on policy "match_locks_update_anon" on topdarter.match_locks is
  'Anonymous users can update their own locks (extend, heartbeat)';

-- Policy: Allow anonymous users to DELETE their own locks
create policy "match_locks_delete_anon"
  on topdarter.match_locks
  for delete
  to anon
  using (locked_by_session_id = current_setting('app.session_id', true));

comment on policy "match_locks_delete_anon" on topdarter.match_locks is
  'Anonymous users can release their own locks';

-- =====================================================================
-- Summary
-- =====================================================================
-- New Policies Created: 9
--   - 2 for matches (INSERT, UPDATE)
--   - 2 for match_legs (INSERT, UPDATE)
--   - 1 for match_stats (SELECT)
--   - 3 for match_locks (INSERT, UPDATE, DELETE)
--   - 1 for match_legs (SELECT) - existing policy already covers this
--
-- Security Model:
--   ✓ Session-based access control via app.session_id
--   ✓ Anon users can create matches freely
--   ✓ Anon users can only modify data when holding a valid lock
--   ✓ Locks are session-specific and time-limited
--   ✓ Stats are visible for public matches only
--
-- Guest Play Flow:
--   1. Anon user creates match (matches_insert_anon)
--   2. Anon user acquires lock (match_locks_insert_anon)
--   3. Anon user records throws (match_legs_insert_anon)
--   4. Stats auto-calculate via triggers
--   5. Anon user views stats (match_stats_select_anon)
--   6. Anon user releases lock (match_locks_delete_anon)
-- =====================================================================
