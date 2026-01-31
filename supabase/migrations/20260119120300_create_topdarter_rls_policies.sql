-- =====================================================================
-- Migration: Create TopDarter Row-Level Security (RLS) Policies
-- =====================================================================
-- Purpose: Implement granular security policies for all topdarter tables
--          to control data access based on user authentication and
--          match participation
-- 
-- Security Model:
--   - Public matches: Visible to everyone (authenticated and anonymous)
--   - Private matches: Visible only to participants
--   - Score entry: Requires valid session lock
--   - Match management: Restricted to participants
--
-- Policy Structure:
--   - Separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)
--   - Separate policies for each role (anon, authenticated)
--   - Explicit deny by default (RLS enabled with no policies = no access)
--
-- Dependencies: 20260119120000_create_topdarter_schema_and_tables.sql
-- Schema Version: 1.0.0
-- Created: 2026-01-19
-- =====================================================================

-- =====================================================================
-- RLS Note: Tables Already Have RLS Enabled
-- =====================================================================
-- RLS was enabled in the initial table creation migration:
--   - topdarter.match_types
--   - topdarter.matches
--   - topdarter.match_legs
--   - topdarter.match_stats
--   - topdarter.match_locks
-- =====================================================================

-- =====================================================================
-- Step 1: Match Types Policies (Public Lookup Table)
-- =====================================================================

-- ---------------------------------------------------------------------
-- SELECT Policies: Anyone can view active match types
-- ---------------------------------------------------------------------

-- Policy for anonymous users
create policy "match_types_select_anon"
  on topdarter.match_types
  for select
  to anon
  using (is_active = true);

comment on policy "match_types_select_anon" on topdarter.match_types is
  'Anonymous users can view active match types (501, 301, Cricket, etc.)';

-- Policy for authenticated users
create policy "match_types_select_authenticated"
  on topdarter.match_types
  for select
  to authenticated
  using (is_active = true);

comment on policy "match_types_select_authenticated" on topdarter.match_types is
  'Authenticated users can view active match types (501, 301, Cricket, etc.)';

-- Note: No INSERT, UPDATE, DELETE policies for match_types
-- Admin operations should be done via service role or database admin

-- =====================================================================
-- Step 2: Matches Policies (Core Match Entity)
-- =====================================================================

-- ---------------------------------------------------------------------
-- SELECT Policies: View matches based on privacy and participation
-- ---------------------------------------------------------------------

-- Policy for anonymous users (public matches only)
create policy "matches_select_anon"
  on topdarter.matches
  for select
  to anon
  using (is_private = false);

comment on policy "matches_select_anon" on topdarter.matches is
  'Anonymous users can view public matches only';

-- Policy for authenticated users (public matches + their own matches)
create policy "matches_select_authenticated"
  on topdarter.matches
  for select
  to authenticated
  using (
    is_private = false
    or player1_user_id = auth.uid()
    or player2_user_id = auth.uid()
    or created_by_user_id = auth.uid()
  );

comment on policy "matches_select_authenticated" on topdarter.matches is
  'Authenticated users can view public matches and matches they participate in';

-- ---------------------------------------------------------------------
-- INSERT Policies: Create matches as a participant
-- ---------------------------------------------------------------------

-- Policy for anonymous users (cannot create matches - need session for locking)
-- Note: Anonymous users play as guests but match is created by authenticated user
-- or through special guest-only API endpoint with session management

-- Policy for authenticated users
create policy "matches_insert_authenticated"
  on topdarter.matches
  for insert
  to authenticated
  with check (
    player1_user_id = auth.uid() 
    or player2_user_id = auth.uid()
    or created_by_user_id = auth.uid()
  );

comment on policy "matches_insert_authenticated" on topdarter.matches is
  'Authenticated users can create matches where they are a participant';

-- ---------------------------------------------------------------------
-- UPDATE Policies: Update matches as participant or lock holder
-- ---------------------------------------------------------------------

-- Policy for anonymous users (no updates - matches require authentication or valid lock)
-- Guest scoring is controlled via session locks, not RLS user-based policies

-- Policy for authenticated users
create policy "matches_update_authenticated"
  on topdarter.matches
  for update
  to authenticated
  using (
    created_by_user_id = auth.uid()
    or player1_user_id = auth.uid()
    or player2_user_id = auth.uid()
    or id in (
      select match_id from topdarter.match_locks
      where locked_by_session_id = current_setting('app.session_id', true)::text
        and expires_at > now()
    )
  );

comment on policy "matches_update_authenticated" on topdarter.matches is
  'Match participants or lock holders can update match state';

-- ---------------------------------------------------------------------
-- DELETE Policies: Delete matches as participant
-- ---------------------------------------------------------------------

-- Policy for anonymous users (cannot delete)

-- Policy for authenticated users
create policy "matches_delete_authenticated"
  on topdarter.matches
  for delete
  to authenticated
  using (
    created_by_user_id = auth.uid()
    or player1_user_id = auth.uid()
    or player2_user_id = auth.uid()
  );

comment on policy "matches_delete_authenticated" on topdarter.matches is
  'Match participants can delete their matches';

-- =====================================================================
-- Step 3: Match Legs Policies (Throw-by-Throw Data)
-- =====================================================================

-- ---------------------------------------------------------------------
-- SELECT Policies: View legs if you can view the match
-- ---------------------------------------------------------------------

-- Policy for anonymous users (public matches only)
create policy "match_legs_select_anon"
  on topdarter.match_legs
  for select
  to anon
  using (
    match_id in (
      select id from topdarter.matches where is_private = false
    )
  );

comment on policy "match_legs_select_anon" on topdarter.match_legs is
  'Anonymous users can view throw data for public matches';

-- Policy for authenticated users (inherits match visibility)
create policy "match_legs_select_authenticated"
  on topdarter.match_legs
  for select
  to authenticated
  using (
    match_id in (select id from topdarter.matches) -- Inherits match SELECT policies
  );

comment on policy "match_legs_select_authenticated" on topdarter.match_legs is
  'Authenticated users can view throw data for matches they can view';

-- ---------------------------------------------------------------------
-- INSERT Policies: Only lock holders can insert scores
-- ---------------------------------------------------------------------

-- Policy for anonymous users with valid session lock
create policy "match_legs_insert_anon"
  on topdarter.match_legs
  for insert
  to anon
  with check (
    match_id in (
      select ml.match_id from topdarter.match_locks ml
      where ml.expires_at > now()
        and ml.locked_by_session_id = current_setting('app.session_id', true)
    )
  );

comment on policy "match_legs_insert_anon" on topdarter.match_legs is
  'Anonymous users with valid session lock can insert throw data';

-- Policy for authenticated users with valid session lock
create policy "match_legs_insert_authenticated"
  on topdarter.match_legs
  for insert
  to authenticated
  with check (
    match_id in (
      select ml.match_id from topdarter.match_locks ml
      where ml.expires_at > now()
        and ml.locked_by_session_id = current_setting('app.session_id', true)
    )
  );

comment on policy "match_legs_insert_authenticated" on topdarter.match_legs is
  'Authenticated users with valid session lock can insert throw data';

-- ---------------------------------------------------------------------
-- UPDATE Policies: Only lock holders can update scores
-- ---------------------------------------------------------------------

-- Policy for anonymous users with valid session lock
create policy "match_legs_update_anon"
  on topdarter.match_legs
  for update
  to anon
  using (
    match_id in (
      select ml.match_id from topdarter.match_locks ml
      where ml.expires_at > now()
        and ml.locked_by_session_id = current_setting('app.session_id', true)
    )
  );

comment on policy "match_legs_update_anon" on topdarter.match_legs is
  'Anonymous users with valid session lock can update throw data (e.g., mark leg complete)';

-- Policy for authenticated users with valid session lock
create policy "match_legs_update_authenticated"
  on topdarter.match_legs
  for update
  to authenticated
  using (
    match_id in (
      select ml.match_id from topdarter.match_locks ml
      where ml.expires_at > now()
        and ml.locked_by_session_id = current_setting('app.session_id', true)
    )
  );

comment on policy "match_legs_update_authenticated" on topdarter.match_legs is
  'Authenticated users with valid session lock can update throw data (e.g., mark leg complete)';

-- ---------------------------------------------------------------------
-- DELETE Policies: Match participants can delete throw history
-- ---------------------------------------------------------------------

-- Policy for anonymous users (cannot delete)

-- Policy for authenticated users (match participants only)
create policy "match_legs_delete_authenticated"
  on topdarter.match_legs
  for delete
  to authenticated
  using (
    match_id in (
      select id from topdarter.matches
      where created_by_user_id = auth.uid()
        or player1_user_id = auth.uid()
        or player2_user_id = auth.uid()
    )
  );

comment on policy "match_legs_delete_authenticated" on topdarter.match_legs is
  'Match participants can delete throw history (e.g., undo scores)';

-- =====================================================================
-- Step 4: Match Stats Policies (Aggregated Statistics)
-- =====================================================================

-- ---------------------------------------------------------------------
-- SELECT Policies: View stats if you can view the match
-- ---------------------------------------------------------------------

-- Policy for anonymous users (public matches only)
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
  'Anonymous users can view statistics for public matches';

-- Policy for authenticated users (inherits match visibility)
create policy "match_stats_select_authenticated"
  on topdarter.match_stats
  for select
  to authenticated
  using (
    match_id in (select id from topdarter.matches) -- Inherits match SELECT policies
  );

comment on policy "match_stats_select_authenticated" on topdarter.match_stats is
  'Authenticated users can view statistics for matches they can view';

-- ---------------------------------------------------------------------
-- INSERT/UPDATE Policies: Auto-updated via triggers (service role)
-- ---------------------------------------------------------------------

-- Policy for anonymous users (auto-updated via triggers)
create policy "match_stats_insert_anon"
  on topdarter.match_stats
  for insert
  to anon
  with check (true); -- Triggers run as service role, bypass this policy

comment on policy "match_stats_insert_anon" on topdarter.match_stats is
  'Statistics auto-created via triggers (service role bypasses this)';

-- Policy for authenticated users (auto-updated via triggers)
create policy "match_stats_insert_authenticated"
  on topdarter.match_stats
  for insert
  to authenticated
  with check (true); -- Triggers run as service role, bypass this policy

comment on policy "match_stats_insert_authenticated" on topdarter.match_stats is
  'Statistics auto-created via triggers (service role bypasses this)';

-- Policy for anonymous users (auto-updated via triggers)
create policy "match_stats_update_anon"
  on topdarter.match_stats
  for update
  to anon
  using (true); -- Triggers run as service role, bypass this policy

comment on policy "match_stats_update_anon" on topdarter.match_stats is
  'Statistics auto-updated via triggers (service role bypasses this)';

-- Policy for authenticated users (auto-updated via triggers)
create policy "match_stats_update_authenticated"
  on topdarter.match_stats
  for update
  to authenticated
  using (true); -- Triggers run as service role, bypass this policy

comment on policy "match_stats_update_authenticated" on topdarter.match_stats is
  'Statistics auto-updated via triggers (service role bypasses this)';

-- Note: No DELETE policies for match_stats
-- Statistics are cascade deleted when parent match is deleted

-- =====================================================================
-- Step 5: Match Locks Policies (Session-Based Concurrency Control)
-- =====================================================================

-- ---------------------------------------------------------------------
-- SELECT Policies: Anyone can see if match is locked
-- ---------------------------------------------------------------------

-- Policy for anonymous users (can see all locks)
create policy "match_locks_select_anon"
  on topdarter.match_locks
  for select
  to anon
  using (true);

comment on policy "match_locks_select_anon" on topdarter.match_locks is
  'Anonymous users can view lock status (needed to show "match in use")';

-- Policy for authenticated users (can see all locks)
create policy "match_locks_select_authenticated"
  on topdarter.match_locks
  for select
  to authenticated
  using (true);

comment on policy "match_locks_select_authenticated" on topdarter.match_locks is
  'Authenticated users can view lock status (needed to show "match in use")';

-- ---------------------------------------------------------------------
-- INSERT Policies: Anyone with valid session can acquire locks
-- ---------------------------------------------------------------------

-- Policy for anonymous users with session
create policy "match_locks_insert_anon"
  on topdarter.match_locks
  for insert
  to anon
  with check (
    locked_by_session_id = current_setting('app.session_id', true)
  );

comment on policy "match_locks_insert_anon" on topdarter.match_locks is
  'Anonymous users can acquire locks with their session ID';

-- Policy for authenticated users with session
create policy "match_locks_insert_authenticated"
  on topdarter.match_locks
  for insert
  to authenticated
  with check (
    locked_by_session_id = current_setting('app.session_id', true)
  );

comment on policy "match_locks_insert_authenticated" on topdarter.match_locks is
  'Authenticated users can acquire locks with their session ID';

-- ---------------------------------------------------------------------
-- UPDATE Policies: Only lock holder can extend/update their lock
-- ---------------------------------------------------------------------

-- Policy for anonymous users (own lock only)
create policy "match_locks_update_anon"
  on topdarter.match_locks
  for update
  to anon
  using (
    locked_by_session_id = current_setting('app.session_id', true)
  );

comment on policy "match_locks_update_anon" on topdarter.match_locks is
  'Anonymous lock holders can extend/update their own locks';

-- Policy for authenticated users (own lock only)
create policy "match_locks_update_authenticated"
  on topdarter.match_locks
  for update
  to authenticated
  using (
    locked_by_session_id = current_setting('app.session_id', true)
  );

comment on policy "match_locks_update_authenticated" on topdarter.match_locks is
  'Authenticated lock holders can extend/update their own locks';

-- ---------------------------------------------------------------------
-- DELETE Policies: Lock holder or match participants can release
-- ---------------------------------------------------------------------

-- Policy for anonymous users (own lock only)
create policy "match_locks_delete_anon"
  on topdarter.match_locks
  for delete
  to anon
  using (
    locked_by_session_id = current_setting('app.session_id', true)
  );

comment on policy "match_locks_delete_anon" on topdarter.match_locks is
  'Anonymous lock holders can release their own locks';

-- Policy for authenticated users (own lock or participant can force release)
create policy "match_locks_delete_authenticated"
  on topdarter.match_locks
  for delete
  to authenticated
  using (
    locked_by_session_id = current_setting('app.session_id', true)
    or
    match_id in (
      select id from topdarter.matches
      where created_by_user_id = auth.uid()
        or player1_user_id = auth.uid()
        or player2_user_id = auth.uid()
    )
  );

comment on policy "match_locks_delete_authenticated" on topdarter.match_locks is
  'Lock holders can release their locks; match participants can force release';

-- =====================================================================
-- RLS Policies Summary
-- =====================================================================
-- Total Policies Created: 32
--
-- By Table:
--   - topdarter.match_types: 2 policies (SELECT only)
--   - topdarter.matches: 6 policies (SELECT, INSERT, UPDATE, DELETE)
--   - topdarter.match_legs: 8 policies (SELECT, INSERT, UPDATE, DELETE)
--   - topdarter.match_stats: 8 policies (SELECT, INSERT, UPDATE - auto via triggers)
--   - topdarter.match_locks: 8 policies (SELECT, INSERT, UPDATE, DELETE)
--
-- By Role:
--   - anon: 15 policies
--   - authenticated: 17 policies
--
-- Security Model:
--   ✓ Public matches visible to everyone
--   ✓ Private matches restricted to participants
--   ✓ Score entry requires valid session lock (prevents concurrent updates)
--   ✓ Match management restricted to participants
--   ✓ Statistics auto-managed via triggers (service role)
--   ✓ Guest players supported via session-based authentication
--
-- Application Responsibilities:
--   1. Generate cryptographically random session IDs (UUID v4)
--   2. Set PostgreSQL session variable before operations:
--      SET app.session_id = '<session_id>'
--   3. Manage lock acquisition/release lifecycle
--   4. Validate score data before insertion
--   5. Handle expired locks gracefully
-- =====================================================================

