-- =====================================================================
-- Migration: Add RLS Policies for Nakka Tables and Public Reference Tables
-- Purpose: Enable Row Level Security and define access policies
-- Date: 2026-02-11
-- Tables Affected:
--   - nakka.tournaments
--   - nakka.tournament_matches
--   - nakka.tournament_match_player_results
--   - public.tournament_types
-- Note: public.goal_progress is a view and inherits RLS from underlying tables
-- =====================================================================

-- =====================================================================
-- 1. NAKKA.TOURNAMENTS - RLS POLICIES
-- =====================================================================

-- Enable Row Level Security
alter table nakka.tournaments enable row level security;

-- RLS Policy: Allow anonymous users to select tournaments
-- Rationale: Tournament data may need to be publicly readable for display/search
create policy "allow_anon_select_tournaments"
  on nakka.tournaments
  for select
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to select tournaments
-- Rationale: Authenticated users should have read access to tournament data
create policy "allow_authenticated_select_tournaments"
  on nakka.tournaments
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow anonymous users to insert tournaments
-- Rationale: Allow external systems to import tournament data via API
create policy "allow_anon_insert_tournaments"
  on nakka.tournaments
  for insert
  to anon
  with check (true);

-- RLS Policy: Allow authenticated users to insert tournaments
-- Rationale: Authenticated users can add new tournament records
create policy "allow_authenticated_insert_tournaments"
  on nakka.tournaments
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Allow anonymous users to update tournaments
-- Rationale: Allow external systems to update tournament metadata via API
create policy "allow_anon_update_tournaments"
  on nakka.tournaments
  for update
  to anon
  using (true)
  with check (true);

-- RLS Policy: Allow authenticated users to update tournaments
-- Rationale: Authenticated users can update tournament information
create policy "allow_authenticated_update_tournaments"
  on nakka.tournaments
  for update
  to authenticated
  using (true)
  with check (true);

-- RLS Policy: Allow anonymous users to delete tournaments
-- Rationale: Allow external systems to clean up tournament data via API
create policy "allow_anon_delete_tournaments"
  on nakka.tournaments
  for delete
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to delete tournaments
-- Rationale: Authenticated users can remove tournament records
create policy "allow_authenticated_delete_tournaments"
  on nakka.tournaments
  for delete
  to authenticated
  using (true);

-- Grant table permissions to roles
-- Service role gets full access (bypasses RLS anyway, but good practice)
grant all on nakka.tournaments to service_role;
grant all on nakka.tournaments to postgres;

-- Authenticated and anon users get access (controlled by RLS policies)
grant select, insert, update, delete on nakka.tournaments to authenticated;
grant select, insert, update, delete on nakka.tournaments to anon;

-- =====================================================================
-- 2. NAKKA.TOURNAMENT_MATCHES - RLS POLICIES
-- =====================================================================

-- Enable Row Level Security
alter table nakka.tournament_matches enable row level security;

-- RLS Policy: Allow anonymous users to select tournament matches
-- Rationale: Match data may need to be publicly readable for display/search
create policy "allow_anon_select_tournament_matches"
  on nakka.tournament_matches
  for select
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to select tournament matches
-- Rationale: Authenticated users should have read access to match data
create policy "allow_authenticated_select_tournament_matches"
  on nakka.tournament_matches
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow anonymous users to insert tournament matches
-- Rationale: Allow external systems to import match data via API
create policy "allow_anon_insert_tournament_matches"
  on nakka.tournament_matches
  for insert
  to anon
  with check (true);

-- RLS Policy: Allow authenticated users to insert tournament matches
-- Rationale: Authenticated users can add new match records
create policy "allow_authenticated_insert_tournament_matches"
  on nakka.tournament_matches
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Allow anonymous users to update tournament matches
-- Rationale: Allow external systems to update match metadata via API
create policy "allow_anon_update_tournament_matches"
  on nakka.tournament_matches
  for update
  to anon
  using (true)
  with check (true);

-- RLS Policy: Allow authenticated users to update tournament matches
-- Rationale: Authenticated users can update match information
create policy "allow_authenticated_update_tournament_matches"
  on nakka.tournament_matches
  for update
  to authenticated
  using (true)
  with check (true);

-- RLS Policy: Allow anonymous users to delete tournament matches
-- Rationale: Allow external systems to clean up match data via API
create policy "allow_anon_delete_tournament_matches"
  on nakka.tournament_matches
  for delete
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to delete tournament matches
-- Rationale: Authenticated users can remove match records
create policy "allow_authenticated_delete_tournament_matches"
  on nakka.tournament_matches
  for delete
  to authenticated
  using (true);

-- Grant table permissions to roles
grant all on nakka.tournament_matches to service_role;
grant all on nakka.tournament_matches to postgres;

grant select, insert, update, delete on nakka.tournament_matches to authenticated;
grant select, insert, update, delete on nakka.tournament_matches to anon;

-- =====================================================================
-- 3. NAKKA.TOURNAMENT_MATCH_PLAYER_RESULTS - RLS POLICIES
-- =====================================================================

-- Enable Row Level Security
alter table nakka.tournament_match_player_results enable row level security;

-- RLS Policy: Allow anonymous users to select player results
-- Rationale: Player statistics may need to be publicly readable for display/search
create policy "allow_anon_select_player_results"
  on nakka.tournament_match_player_results
  for select
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to select player results
-- Rationale: Authenticated users should have read access to player statistics
create policy "allow_authenticated_select_player_results"
  on nakka.tournament_match_player_results
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow anonymous users to insert player results
-- Rationale: Allow external systems to import player statistics via API
create policy "allow_anon_insert_player_results"
  on nakka.tournament_match_player_results
  for insert
  to anon
  with check (true);

-- RLS Policy: Allow authenticated users to insert player results
-- Rationale: Authenticated users can add new player statistics
create policy "allow_authenticated_insert_player_results"
  on nakka.tournament_match_player_results
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Allow anonymous users to update player results
-- Rationale: Allow external systems to update player statistics via API
create policy "allow_anon_update_player_results"
  on nakka.tournament_match_player_results
  for update
  to anon
  using (true)
  with check (true);

-- RLS Policy: Allow authenticated users to update player results
-- Rationale: Authenticated users can update player statistics
create policy "allow_authenticated_update_player_results"
  on nakka.tournament_match_player_results
  for update
  to authenticated
  using (true)
  with check (true);

-- RLS Policy: Allow anonymous users to delete player results
-- Rationale: Allow external systems to clean up player statistics via API
create policy "allow_anon_delete_player_results"
  on nakka.tournament_match_player_results
  for delete
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to delete player results
-- Rationale: Authenticated users can remove player statistics
create policy "allow_authenticated_delete_player_results"
  on nakka.tournament_match_player_results
  for delete
  to authenticated
  using (true);

-- Grant table permissions to roles
grant all on nakka.tournament_match_player_results to service_role;
grant all on nakka.tournament_match_player_results to postgres;

grant select, insert, update, delete on nakka.tournament_match_player_results to authenticated;
grant select, insert, update, delete on nakka.tournament_match_player_results to anon;

-- =====================================================================
-- 4. PUBLIC.TOURNAMENT_TYPES - RLS POLICIES
-- =====================================================================

-- Enable Row Level Security (if not already enabled)
alter table public.tournament_types enable row level security;

-- RLS Policy: Allow anonymous users to select tournament types
-- Rationale: Tournament types are reference data needed by all users
create policy "allow_anon_select_tournament_types"
  on public.tournament_types
  for select
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to select tournament types
-- Rationale: Tournament types are reference data needed by all users
create policy "allow_authenticated_select_tournament_types"
  on public.tournament_types
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow authenticated users to insert tournament types
-- Rationale: Authenticated users may need to add new tournament types
create policy "allow_authenticated_insert_tournament_types"
  on public.tournament_types
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Allow authenticated users to update tournament types
-- Rationale: Authenticated users may need to modify tournament type names
create policy "allow_authenticated_update_tournament_types"
  on public.tournament_types
  for update
  to authenticated
  using (true)
  with check (true);

-- RLS Policy: Allow authenticated users to delete tournament types
-- Rationale: Authenticated users may need to remove obsolete tournament types
create policy "allow_authenticated_delete_tournament_types"
  on public.tournament_types
  for delete
  to authenticated
  using (true);

-- Grant table permissions to roles
grant all on public.tournament_types to service_role;
grant all on public.tournament_types to postgres;

grant select on public.tournament_types to anon;
grant select, insert, update, delete on public.tournament_types to authenticated;

-- Grant sequence permissions (for SERIAL primary key)
grant usage, select on sequence public.tournament_types_id_seq to authenticated;

-- =====================================================================
-- NOTE: RLS for public.goal_progress
-- =====================================================================
-- public.goal_progress is a VIEW, not a table.
-- Views inherit Row Level Security from their underlying tables:
--   - goals (already has RLS policies for user-owned data)
--   - tournaments (already has RLS policies for user-owned data)
--   - tournament_match_results (already has RLS policies via tournament ownership)
-- Therefore, no separate RLS policies are needed for the goal_progress view.
-- Users will only see goal progress data for their own goals and tournaments.
-- =====================================================================
