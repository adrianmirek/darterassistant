-- =====================================================================
-- Migration: Create TopDarter Schema and Core Tables
-- =====================================================================
-- Purpose: Initialize the topdarter schema with all core tables for
--          standalone match functionality
-- 
-- Tables Created:
--   - topdarter.match_types (lookup table for game types)
--   - topdarter.matches (core match entity)
--   - topdarter.match_legs (throw-by-throw scoring data)
--   - topdarter.match_stats (aggregated player statistics)
--   - topdarter.match_locks (session-based concurrency control)
--
-- Dependencies: Supabase Auth (auth.users table)
-- Schema Version: 1.0.0
-- Created: 2026-01-19
-- =====================================================================

-- =====================================================================
-- Step 1: Create Schema
-- =====================================================================

-- Create the topdarter schema to namespace all standalone match tables
create schema if not exists topdarter;

comment on schema topdarter is 'Schema for TopDarter';

-- =====================================================================
-- Step 2: Create Lookup Tables
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table: topdarter.match_types
-- ---------------------------------------------------------------------
-- Purpose: Defines available game types with default configurations
-- Examples: 501, 301, Cricket
-- Access: Public read for active types only
-- ---------------------------------------------------------------------

create table topdarter.match_types (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null unique,
  default_start_score integer not null default 501 check (default_start_score >= 0),
  default_checkout_rule varchar(50) not null default 'double_out' 
    check (default_checkout_rule in ('straight', 'double_out', 'master_out')),
  default_format_type varchar(50) not null default 'first_to' 
    check (default_format_type in ('first_to', 'best_of', 'unlimited')),
  default_legs_count integer check (default_legs_count > 0),
  default_sets_count integer check (default_sets_count > 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table topdarter.match_types is 'Lookup table for available match types (501, 301, Cricket, etc.)';
comment on column topdarter.match_types.default_checkout_rule is 'straight: any finish, double_out: must finish on double, master_out: double or bullseye';
comment on column topdarter.match_types.default_format_type is 'first_to: first to X legs, best_of: best of X legs, unlimited: practice mode';
comment on column topdarter.match_types.is_active is 'Soft delete flag - inactive types hidden from UI';

-- Enable RLS (policies will be created in separate migration)
alter table topdarter.match_types enable row level security;

-- =====================================================================
-- Step 3: Create Core Match Tables
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table: topdarter.matches
-- ---------------------------------------------------------------------
-- Purpose: Core match entity storing match configuration, state, and results
-- Players: Supports both authenticated users and guest players (XOR constraint)
-- Privacy: Public or private matches via is_private flag
-- Status: setup -> in_progress -> (paused) -> completed/cancelled
-- ---------------------------------------------------------------------

create table topdarter.matches (
  id uuid primary key default gen_random_uuid(),
  match_type_id uuid not null references topdarter.match_types(id),
  
  -- Player 1 identification (authenticated user XOR guest)
  player1_user_id uuid references auth.users(id) on delete cascade,
  player1_guest_name varchar(255),
  
  -- Player 2 identification (authenticated user XOR guest)
  player2_user_id uuid references auth.users(id) on delete cascade,
  player2_guest_name varchar(255),
  
  -- Match configuration
  start_score integer not null default 501 check (start_score > 0),
  checkout_rule varchar(50) not null default 'double_out' 
    check (checkout_rule in ('straight', 'double_out', 'master_out')),
  format_type varchar(50) not null default 'first_to' 
    check (format_type in ('first_to', 'best_of', 'unlimited')),
  legs_count integer check (legs_count > 0),
  sets_count integer check (sets_count > 0),
  
  -- Match state
  current_leg integer not null default 1 check (current_leg > 0),
  current_set integer not null default 1 check (current_set > 0),
  player1_legs_won integer not null default 0 check (player1_legs_won >= 0),
  player2_legs_won integer not null default 0 check (player2_legs_won >= 0),
  player1_sets_won integer not null default 0 check (player1_sets_won >= 0),
  player2_sets_won integer not null default 0 check (player2_sets_won >= 0),
  
  -- Match result
  winner_player_number integer check (winner_player_number in (1, 2)),
  match_status varchar(50) not null default 'setup' 
    check (match_status in ('setup', 'in_progress', 'paused', 'completed', 'cancelled')),
  
  -- Privacy and timestamps
  is_private boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer generated always as (
    extract(epoch from (completed_at - started_at))::integer
  ) stored,
  
  -- Audit fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  
  -- Player identification constraints (XOR: exactly one must be populated)
  constraint player1_xor_constraint check (
    (player1_user_id is not null and player1_guest_name is null) or
    (player1_user_id is null and player1_guest_name is not null)
  ),
  constraint player2_xor_constraint check (
    (player2_user_id is not null and player2_guest_name is null) or
    (player2_user_id is null and player2_guest_name is not null)
  ),
  
  -- Format validation: legs_count required for first_to/best_of
  constraint format_legs_constraint check (
    (format_type in ('first_to', 'best_of') and legs_count is not null) or
    (format_type = 'unlimited')
  ),
  
  -- Time validation: completed_at must be after started_at
  constraint time_validation_constraint check (
    completed_at is null or completed_at >= started_at
  )
);

comment on table topdarter.matches is 'Core match entity for standalone matches';
comment on column topdarter.matches.match_status is 'setup: initial, in_progress: active, paused: temporary halt, completed: finished, cancelled: abandoned';
comment on column topdarter.matches.is_private is 'Private matches visible only to participants';
comment on column topdarter.matches.duration_seconds is 'Automatically calculated match duration';
comment on column topdarter.matches.created_by_user_id is 'User who created the match (null for guest-initiated matches)';

-- Enable RLS (policies will be created in separate migration)
alter table topdarter.matches enable row level security;

-- ---------------------------------------------------------------------
-- Table: topdarter.match_legs
-- ---------------------------------------------------------------------
-- Purpose: Throw-by-throw granular scoring data for complete match replay
-- Granularity: Each individual dart throw stored separately
-- Primary Access: Sequential by match_id, leg_number, round_number, throw_number
-- Updates: Leg completion sets winner_player_number and winning_checkout
-- ---------------------------------------------------------------------

create table topdarter.match_legs (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references topdarter.matches(id) on delete cascade,
  leg_number integer not null check (leg_number > 0),
  set_number integer not null default 1 check (set_number > 0),
  player_number integer not null check (player_number in (1, 2)),
  throw_number integer not null check (throw_number between 1 and 3),
  round_number integer not null check (round_number > 0),
  
  -- Throw data
  score integer not null check (score between 0 and 180),
  remaining_score integer not null check (remaining_score >= 0),
  is_checkout_attempt boolean not null default false,
  
  -- Leg completion data (populated when leg finishes)
  winner_player_number integer check (winner_player_number in (1, 2)),
  winning_checkout integer check (winning_checkout between 2 and 170),
  
  -- Timestamps
  started_at timestamptz,
  completed_at timestamptz,
  duration_seconds integer generated always as (
    extract(epoch from (completed_at - started_at))::integer
  ) stored,
  created_at timestamptz not null default now(),
  
  -- Unique throw identification
  constraint unique_throw unique (
    match_id, leg_number, set_number, player_number, throw_number, round_number
  )
);

comment on table topdarter.match_legs is 'Throw-by-throw scoring data for detailed match replay and statistics';
comment on column topdarter.match_legs.throw_number is 'Throw number within round (1-3)';
comment on column topdarter.match_legs.round_number is 'Turn number in the leg';
comment on column topdarter.match_legs.score is 'Points scored on this throw (0-180 for round total)';
comment on column topdarter.match_legs.remaining_score is 'Score remaining after this throw';
comment on column topdarter.match_legs.is_checkout_attempt is 'True if player attempted to finish the leg';
comment on column topdarter.match_legs.winner_player_number is 'Set when leg completes, indicates winner';
comment on column topdarter.match_legs.winning_checkout is 'Final checkout score if leg was won';

-- Enable RLS (policies will be created in separate migration)
alter table topdarter.match_legs enable row level security;

-- ---------------------------------------------------------------------
-- Table: topdarter.match_stats
-- ---------------------------------------------------------------------
-- Purpose: Aggregated match-level statistics per player
-- Updates: Incrementally updated via triggers on match_legs inserts/updates
-- Calculations: average_score computed as generated column
-- Cardinality: Exactly 2 rows per match (one per player)
-- ---------------------------------------------------------------------

create table topdarter.match_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references topdarter.matches(id) on delete cascade,
  player_number integer not null check (player_number in (1, 2)),
  
  -- Core statistics
  total_score integer not null default 0 check (total_score >= 0),
  darts_thrown integer not null default 0 check (darts_thrown >= 0),
  rounds_played integer not null default 0 check (rounds_played >= 0),
  
  -- Calculated average (three-dart average)
  average_score numeric(5,2) generated always as (
    case when darts_thrown > 0 then (total_score::numeric / darts_thrown * 3) else 0 end
  ) stored,
  first_9_average numeric(5,2) check (first_9_average >= 0),
  
  -- Score distribution counters
  scores_60_plus integer not null default 0 check (scores_60_plus >= 0),
  scores_80_plus integer not null default 0 check (scores_80_plus >= 0),
  scores_100_plus integer not null default 0 check (scores_100_plus >= 0),
  scores_120_plus integer not null default 0 check (scores_120_plus >= 0),
  scores_140_plus integer not null default 0 check (scores_140_plus >= 0),
  scores_170_plus integer not null default 0 check (scores_170_plus >= 0),
  scores_180 integer not null default 0 check (scores_180 >= 0),
  
  -- Checkout statistics
  checkout_attempts integer not null default 0 check (checkout_attempts >= 0),
  successful_checkouts integer not null default 0 check (successful_checkouts >= 0),
  high_finish integer check (high_finish between 2 and 170),
  finishes_100_plus integer not null default 0 check (finishes_100_plus >= 0),
  
  -- Leg statistics
  best_leg_darts integer check (best_leg_darts > 0),
  worst_leg_darts integer check (worst_leg_darts > 0),
  legs_won_on_own_throw integer not null default 0 check (legs_won_on_own_throw >= 0),
  legs_won_on_opponent_throw integer not null default 0 check (legs_won_on_opponent_throw >= 0),
  
  -- Audit fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Unique constraint: one stats row per player per match
  constraint unique_match_player unique (match_id, player_number),
  
  -- Checkout validation
  constraint checkout_validation check (successful_checkouts <= checkout_attempts)
);

comment on table topdarter.match_stats is 'Aggregated match statistics per player, updated incrementally via triggers';
comment on column topdarter.match_stats.average_score is 'Three-dart average automatically calculated';
comment on column topdarter.match_stats.first_9_average is 'Average of first 9 darts (first 3 rounds)';
comment on column topdarter.match_stats.legs_won_on_own_throw is 'Holds - legs won when starting the leg';
comment on column topdarter.match_stats.legs_won_on_opponent_throw is 'Breaks - legs won when opponent started';

-- Enable RLS (policies will be created in separate migration)
alter table topdarter.match_stats enable row level security;

-- ---------------------------------------------------------------------
-- Table: topdarter.match_locks
-- ---------------------------------------------------------------------
-- Purpose: Session-based locking to prevent concurrent score entry
-- Mechanism: Single lock per match identified by session_id
-- Expiration: 30-minute TTL with optional auto-extension
-- Security: RLS policies enforce only lock holder can update scores
-- ---------------------------------------------------------------------

create table topdarter.match_locks (
  match_id uuid primary key references topdarter.matches(id) on delete cascade,
  locked_by_session_id varchar(255) not null unique,
  device_info jsonb not null default '{}'::jsonb,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  auto_extend boolean not null default true,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table topdarter.match_locks is 'Session-based locks to prevent concurrent scoring from multiple devices';
comment on column topdarter.match_locks.locked_by_session_id is 'Application session ID holding the lock (must be cryptographically random)';
comment on column topdarter.match_locks.device_info is 'JSONB audit trail: browser, OS, IP (for troubleshooting)';
comment on column topdarter.match_locks.expires_at is 'Lock auto-expires after 30 minutes of inactivity';
comment on column topdarter.match_locks.auto_extend is 'If true, lock extends on activity';

-- Enable RLS (policies will be created in separate migration)
alter table topdarter.match_locks enable row level security;

-- =====================================================================
-- Migration Complete
-- =====================================================================
-- Next Steps:
--   1. Run indexes migration for performance optimization
--   2. Run functions/triggers migration for business logic
--   3. Run RLS policies migration for security
-- =====================================================================

