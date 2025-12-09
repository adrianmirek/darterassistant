-- =====================================================================
-- Migration: Initial Database Schema for Darter Assistant
-- Purpose: Create core tables, views, indexes, and RLS policies
-- Affected Objects:
--   - Tables: match_types, tournaments, tournament_match_results, goals
--   - Views: goal_progress
--   - Indexes: idx_tournaments_user_date, idx_results_tournament
--   - RLS Policies: All user-scoped access controls
-- Special Considerations:
--   - Exclusion constraint on goals prevents overlapping date ranges
--   - All user-scoped tables have RLS enabled
-- =====================================================================

-- =====================================================================
-- 0. ENABLE REQUIRED EXTENSIONS
-- =====================================================================

-- Enable btree_gist extension for GIST operator classes on basic types
-- Required for the exclusion constraint on goals table with UUID column
create extension if not exists btree_gist;

-- =====================================================================
-- 1. CREATE TABLES
-- =====================================================================

-- Create match_types lookup table
-- This table stores different match types (e.g., 501 DO, 301 SO)
create table if not exists match_types (
  id serial primary key,
  name text not null unique
);

-- Enable RLS on match_types (publicly readable reference table)
alter table match_types enable row level security;

-- Create tournaments table
-- Stores tournament metadata owned by authenticated users
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date date not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on tournaments
alter table tournaments enable row level security;

-- Create tournament_match_results table
-- Stores detailed statistics for each match within a tournament
create table if not exists tournament_match_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  match_type_id integer not null references match_types(id),
  average_score numeric(5,2) not null check (average_score >= 0),
  first_nine_avg numeric(5,2) not null check (first_nine_avg >= 0),
  checkout_percentage numeric(5,2) not null check (checkout_percentage >= 0 and checkout_percentage <= 100),
  score_60_count integer not null default 0 check (score_60_count >= 0),
  score_100_count integer not null default 0 check (score_100_count >= 0),
  score_140_count integer not null default 0 check (score_140_count >= 0),
  score_180_count integer not null default 0 check (score_180_count >= 0),
  high_finish integer not null default 0 check (high_finish >= 0),
  best_leg integer not null default 0 check (best_leg >= 0),
  worst_leg integer not null default 0 check (worst_leg >= 0),
  created_at timestamptz not null default now()
);

-- Enable RLS on tournament_match_results
alter table tournament_match_results enable row level security;

-- Create goals table
-- Stores user goals with target averages and date ranges
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_avg numeric(5,2) not null check (target_avg >= 0),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on goals
alter table goals enable row level security;

-- Add exclusion constraint to prevent overlapping goals per user
-- This ensures a user cannot have multiple goals with overlapping date ranges
alter table goals
  add constraint no_overlapping_goals
  exclude using gist (
    user_id with =,
    daterange(start_date, end_date, '[]') with &&
  );

-- =====================================================================
-- 2. CREATE INDEXES
-- =====================================================================

-- Index for efficient user tournament queries, ordered by date descending
create index idx_tournaments_user_date on tournaments(user_id, date desc);

-- Index for efficient tournament match result lookups
create index idx_results_tournament on tournament_match_results(tournament_id);

-- =====================================================================
-- 3. CREATE VIEWS
-- =====================================================================

-- Create goal_progress view
-- Aggregates tournament match results within goal date ranges
-- Calculates average score, tournament count, and progress percentage
create or replace view goal_progress as
select
  g.id as goal_id,
  g.user_id,
  g.target_avg,
  g.start_date,
  g.end_date,
  coalesce(avg(r.average_score), 0) as average_score,
  count(r.*) as tournament_count,
  case 
    when g.target_avg = 0 then 0
    else round((avg(r.average_score) / g.target_avg) * 100, 2)
  end as progress_percentage
from goals g
left join tournaments t
  on t.user_id = g.user_id
  and t.date between g.start_date and g.end_date
left join tournament_match_results r
  on r.tournament_id = t.id
group by g.id;

-- =====================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- ---------------------------------------------------------------------
-- match_types policies (public read access)
-- ---------------------------------------------------------------------

-- Allow anonymous users to read match types
-- Rationale: Match types are reference data needed by all users
create policy select_match_types_anon on match_types
  for select
  to anon
  using (true);

-- Allow authenticated users to read match types
-- Rationale: Match types are reference data needed by all users
create policy select_match_types_authenticated on match_types
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- tournaments policies (user-owned data)
-- ---------------------------------------------------------------------

-- Allow authenticated users to select their own tournaments
-- Rationale: Users should only see their own tournament data
create policy select_tournaments_authenticated on tournaments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow authenticated users to insert their own tournaments
-- Rationale: Users can create new tournaments for themselves
create policy insert_tournaments_authenticated on tournaments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow authenticated users to update their own tournaments
-- Rationale: Users can modify their own tournament data
create policy update_tournaments_authenticated on tournaments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to delete their own tournaments
-- Rationale: Users can remove their own tournament data
-- Note: CASCADE will automatically delete related match results
create policy delete_tournaments_authenticated on tournaments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- tournament_match_results policies (user-owned via tournament)
-- ---------------------------------------------------------------------

-- Allow authenticated users to select match results for their tournaments
-- Rationale: Users should only see results from tournaments they own
create policy select_results_authenticated on tournament_match_results
  for select
  to authenticated
  using (
    auth.uid() = (
      select user_id from tournaments where id = tournament_id
    )
  );

-- Allow authenticated users to insert match results for their tournaments
-- Rationale: Users can add results to their own tournaments
create policy insert_results_authenticated on tournament_match_results
  for insert
  to authenticated
  with check (
    auth.uid() = (
      select user_id from tournaments where id = tournament_id
    )
  );

-- Allow authenticated users to update match results for their tournaments
-- Rationale: Users can modify results in their own tournaments
create policy update_results_authenticated on tournament_match_results
  for update
  to authenticated
  using (
    auth.uid() = (
      select user_id from tournaments where id = tournament_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from tournaments where id = tournament_id
    )
  );

-- Allow authenticated users to delete match results for their tournaments
-- Rationale: Users can remove results from their own tournaments
create policy delete_results_authenticated on tournament_match_results
  for delete
  to authenticated
  using (
    auth.uid() = (
      select user_id from tournaments where id = tournament_id
    )
  );

-- ---------------------------------------------------------------------
-- goals policies (user-owned data)
-- ---------------------------------------------------------------------

-- Allow authenticated users to select their own goals
-- Rationale: Users should only see their own goals
create policy select_goals_authenticated on goals
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Allow authenticated users to insert their own goals
-- Rationale: Users can create new goals for themselves
-- Note: Exclusion constraint will prevent overlapping date ranges
create policy insert_goals_authenticated on goals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow authenticated users to update their own goals
-- Rationale: Users can modify their own goals
-- Note: Exclusion constraint will prevent overlapping date ranges
create policy update_goals_authenticated on goals
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to delete their own goals
-- Rationale: Users can remove their own goals
create policy delete_goals_authenticated on goals
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================================
-- 5. SEED DATA
-- =====================================================================

-- Insert common match types
-- This provides initial reference data for the application
insert into match_types (name) values
  ('501 DO'),
  ('501 DI DO'),
  ('501 SO'),
  ('301 DO'),
  ('301 DI DO'),
  ('301 SO'),
  ('Other')
on conflict (name) do nothing;

