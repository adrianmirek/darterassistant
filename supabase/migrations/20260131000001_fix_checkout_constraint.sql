-- =====================================================================
-- Migration: Fix Checkout Statistics Constraint Violation
-- =====================================================================
-- Purpose: Fix the leg completion trigger to properly insert checkout_attempts
--          when recording a successful checkout
-- 
-- Issue: The trigger inserts successful_checkouts=1 but doesn't set
--        checkout_attempts, which defaults to 0, violating the constraint:
--        successful_checkouts <= checkout_attempts
-- 
-- Solution: Include checkout_attempts in the INSERT statement
-- 
-- Dependencies: 20260131000000_fix_leg_completion_trigger.sql
-- Created: 2026-01-31
-- =====================================================================

-- Drop existing function first (to avoid permission issues)
drop function if exists public.update_match_on_leg_complete() cascade;

-- Create the fixed leg completion function
create function public.update_match_on_leg_complete()
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
        checkout_attempts,      -- FIX: Include this to satisfy constraint
        successful_checkouts,
        high_finish,
        finishes_100_plus
      )
      values (
        new.match_id,
        new.winner_player_number,
        1,                      -- FIX: At least 1 attempt if successful
        1,                      -- First successful checkout
        new.winning_checkout,
        case when new.winning_checkout >= 100 then 1 else 0 end
      )
      on conflict (match_id, player_number) do update set
        checkout_attempts = topdarter.match_stats.checkout_attempts + 1,  -- FIX: Increment this too!
        successful_checkouts = topdarter.match_stats.successful_checkouts + 1,
        -- FIX: Use COALESCE to handle NULL high_finish
        high_finish = greatest(
          coalesce(topdarter.match_stats.high_finish, 0), 
          new.winning_checkout
        ),
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
  'Updates match state and determines winner when leg completes (FIXED: checkout constraint)';

-- Recreate trigger (since we dropped the function with CASCADE)
create trigger trigger_update_match_on_leg_complete
  after insert or update on topdarter.match_legs
  for each row
  execute function public.update_match_on_leg_complete();

comment on trigger trigger_update_match_on_leg_complete on topdarter.match_legs is
  'Updates match state and checks for match winner when leg completes (INSERT or UPDATE)';

-- =====================================================================
-- Migration Summary
-- =====================================================================
-- Fixed: Added checkout_attempts to INSERT to satisfy constraint
-- Fixed: Added COALESCE to handle NULL high_finish in UPDATE
-- Fixed: Recreated trigger after dropping function with CASCADE
-- Impact: Successful checkouts will now be recorded correctly
-- =====================================================================
