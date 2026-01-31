-- =====================================================================
-- Script: Move Functions from topdarter to public Schema
-- =====================================================================
-- Purpose: Migrate existing functions from topdarter schema to public schema
--          for existing local databases that were created with the old migrations
-- 
-- Usage: Run this script manually on your local database:
--   psql -h localhost -p 54322 -d postgres -U postgres -f fix_move_functions_to_public_schema.sql
--   
--   Or via Supabase CLI:
--   npx supabase db execute --file fix_move_functions_to_public_schema.sql
--
-- What this does:
--   1. Drops old triggers that reference topdarter schema functions
--   2. Drops old functions from topdarter schema
--   3. Creates functions in public schema
--   4. Recreates triggers to use public schema functions
--
-- Note: This is a one-time fix for existing databases. 
--       New databases will use the updated migration files.
-- =====================================================================

-- =====================================================================
-- Step 1: Drop Old Triggers (referencing topdarter schema functions)
-- =====================================================================

drop trigger if exists update_match_types_updated_at on topdarter.match_types;
drop trigger if exists update_matches_updated_at on topdarter.matches;
drop trigger if exists update_match_stats_updated_at on topdarter.match_stats;
drop trigger if exists update_match_locks_updated_at on topdarter.match_locks;
drop trigger if exists trigger_update_match_stats_on_score on topdarter.match_legs;
drop trigger if exists trigger_update_match_on_leg_complete on topdarter.match_legs;

-- =====================================================================
-- Step 2: Drop Old Functions from topdarter Schema
-- =====================================================================

drop function if exists topdarter.update_updated_at_column() cascade;
drop function if exists topdarter.update_match_stats_on_score() cascade;
drop function if exists topdarter.update_match_on_leg_complete() cascade;

-- =====================================================================
-- Step 3: Create Functions in public Schema
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: update_updated_at_column()
-- ---------------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.update_updated_at_column() is 
  'Automatically updates updated_at timestamp on row update';

-- ---------------------------------------------------------------------
-- Function: update_match_stats_on_score()
-- ---------------------------------------------------------------------
create or replace function public.update_match_stats_on_score()
returns trigger
language plpgsql
security definer
as $$
declare
  round_total integer;
begin
  -- Process completed rounds (throw_number = 3)
  if new.throw_number = 3 then
    -- Calculate total score for this round (sum of 3 throws)
    select coalesce(sum(score), 0) into round_total
    from topdarter.match_legs
    where match_id = new.match_id
      and leg_number = new.leg_number
      and player_number = new.player_number
      and round_number = new.round_number;

    -- Upsert match statistics with incremental updates
    insert into topdarter.match_stats (
      match_id,
      player_number,
      total_score,
      darts_thrown,
      rounds_played,
      scores_60_plus,
      scores_80_plus,
      scores_100_plus,
      scores_120_plus,
      scores_140_plus,
      scores_170_plus,
      scores_180
    )
    values (
      new.match_id,
      new.player_number,
      round_total,
      3, -- Three darts per round
      1, -- One round
      case when round_total >= 60 then 1 else 0 end,
      case when round_total >= 80 then 1 else 0 end,
      case when round_total >= 100 then 1 else 0 end,
      case when round_total >= 120 then 1 else 0 end,
      case when round_total >= 140 then 1 else 0 end,
      case when round_total >= 170 then 1 else 0 end,
      case when round_total = 180 then 1 else 0 end
    )
    on conflict (match_id, player_number) do update set
      -- Increment running totals
      total_score = topdarter.match_stats.total_score + round_total,
      darts_thrown = topdarter.match_stats.darts_thrown + 3,
      rounds_played = topdarter.match_stats.rounds_played + 1,
      -- Increment score distribution counters
      scores_60_plus = topdarter.match_stats.scores_60_plus + case when round_total >= 60 then 1 else 0 end,
      scores_80_plus = topdarter.match_stats.scores_80_plus + case when round_total >= 80 then 1 else 0 end,
      scores_100_plus = topdarter.match_stats.scores_100_plus + case when round_total >= 100 then 1 else 0 end,
      scores_120_plus = topdarter.match_stats.scores_120_plus + case when round_total >= 120 then 1 else 0 end,
      scores_140_plus = topdarter.match_stats.scores_140_plus + case when round_total >= 140 then 1 else 0 end,
      scores_170_plus = topdarter.match_stats.scores_170_plus + case when round_total >= 170 then 1 else 0 end,
      scores_180 = topdarter.match_stats.scores_180 + case when round_total = 180 then 1 else 0 end;
  end if;

  -- Track checkout attempts (can occur on any throw)
  if new.is_checkout_attempt then
    insert into topdarter.match_stats (match_id, player_number, checkout_attempts)
    values (new.match_id, new.player_number, 1)
    on conflict (match_id, player_number) do update set
      checkout_attempts = topdarter.match_stats.checkout_attempts + 1;
  end if;

  return new;
end;
$$;

comment on function public.update_match_stats_on_score() is 
  'Incrementally updates match statistics when throws are recorded';

-- ---------------------------------------------------------------------
-- Function: update_match_on_leg_complete()
-- ---------------------------------------------------------------------
create or replace function public.update_match_on_leg_complete()
returns trigger
language plpgsql
security definer
as $$
declare
  match_legs_count integer;
  match_format varchar(50);
  p1_legs integer;
  p2_legs integer;
  winner integer;
begin
  -- Only process when winner is set and changed
  if new.winner_player_number is not null and 
     (old.winner_player_number is null or old.winner_player_number != new.winner_player_number) then
    
    -- Get current match state
    select legs_count, format_type, player1_legs_won, player2_legs_won
    into match_legs_count, match_format, p1_legs, p2_legs
    from topdarter.matches
    where id = new.match_id;

    -- Increment legs won for winner
    if new.winner_player_number = 1 then
      p1_legs := p1_legs + 1;
    else
      p2_legs := p2_legs + 1;
    end if;

    -- Update successful checkout statistics
    if new.winning_checkout is not null then
      insert into topdarter.match_stats (
        match_id,
        player_number,
        successful_checkouts,
        high_finish,
        finishes_100_plus
      )
      values (
        new.match_id,
        new.winner_player_number,
        1, -- First successful checkout
        new.winning_checkout,
        case when new.winning_checkout >= 100 then 1 else 0 end
      )
      on conflict (match_id, player_number) do update set
        successful_checkouts = topdarter.match_stats.successful_checkouts + 1,
        -- Update high_finish only if this checkout is higher
        high_finish = greatest(topdarter.match_stats.high_finish, new.winning_checkout),
        finishes_100_plus = topdarter.match_stats.finishes_100_plus + 
          case when new.winning_checkout >= 100 then 1 else 0 end;
    end if;

    -- Determine match winner based on format
    winner := null;
    if match_format = 'first_to' then
      -- First to reach legs_count wins
      if p1_legs >= match_legs_count then
        winner := 1;
      elsif p2_legs >= match_legs_count then
        winner := 2;
      end if;
    elsif match_format = 'best_of' then
      -- First to win more than half of legs_count wins
      if p1_legs > match_legs_count / 2 then
        winner := 1;
      elsif p2_legs > match_legs_count / 2 then
        winner := 2;
      end if;
    end if;
    -- Note: unlimited format never auto-completes (practice mode)

    -- Update match with new legs won and potential winner
    update topdarter.matches
    set 
      player1_legs_won = p1_legs,
      player2_legs_won = p2_legs,
      -- Only set winner if determined (preserve existing if already set)
      winner_player_number = coalesce(winner, winner_player_number),
      -- Mark as completed if winner determined
      match_status = case when winner is not null then 'completed' else match_status end,
      -- Set completion timestamp if winner determined
      completed_at = case when winner is not null then now() else completed_at end
    where id = new.match_id;

  end if;

  return new;
end;
$$;

comment on function public.update_match_on_leg_complete() is 
  'Updates match state and determines winner when leg completes';

-- =====================================================================
-- Step 4: Recreate Triggers (using public schema functions)
-- =====================================================================

-- Timestamp triggers
create trigger update_match_types_updated_at
  before update on topdarter.match_types
  for each row
  execute function public.update_updated_at_column();

create trigger update_matches_updated_at
  before update on topdarter.matches
  for each row
  execute function public.update_updated_at_column();

create trigger update_match_stats_updated_at
  before update on topdarter.match_stats
  for each row
  execute function public.update_updated_at_column();

create trigger update_match_locks_updated_at
  before update on topdarter.match_locks
  for each row
  execute function public.update_updated_at_column();

-- Statistics trigger
create trigger trigger_update_match_stats_on_score
  after insert on topdarter.match_legs
  for each row
  execute function public.update_match_stats_on_score();

-- Match completion trigger
create trigger trigger_update_match_on_leg_complete
  after update on topdarter.match_legs
  for each row
  execute function public.update_match_on_leg_complete();

-- =====================================================================
-- Migration Complete
-- =====================================================================
-- Summary:
--   ✓ Dropped old triggers
--   ✓ Dropped old functions from topdarter schema
--   ✓ Created functions in public schema
--   ✓ Recreated triggers using public schema functions
--
-- Verification:
--   Run this query to verify functions are in public schema:
--   
--   SELECT n.nspname as schema, p.proname as function
--   FROM pg_proc p
--   JOIN pg_namespace n ON p.pronamespace = n.oid
--   WHERE p.proname IN (
--     'update_updated_at_column',
--     'update_match_stats_on_score',
--     'update_match_on_leg_complete'
--   )
--   ORDER BY schema, function;
--
-- Expected result:
--   public | update_match_on_leg_complete
--   public | update_match_stats_on_score
--   public | update_updated_at_column
-- =====================================================================
