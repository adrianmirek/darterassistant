-- =====================================================================
-- Migration: Fix Checkout Attempts in UPDATE clause
-- =====================================================================
-- Purpose: Also increment checkout_attempts in the ON CONFLICT UPDATE
--          Previously only successful_checkouts was incremented
-- 
-- Issue: When a successful checkout happens and the stats row already
--        exists, the UPDATE clause didn't increment checkout_attempts,
--        causing constraint violation (successful_checkouts > checkout_attempts)
-- 
-- Solution: Add checkout_attempts increment to UPDATE clause
-- 
-- Dependencies: 20260131000001_fix_checkout_constraint.sql
-- Created: 2026-01-31
-- =====================================================================

-- Drop and recreate the function with the complete fix
drop function if exists public.update_match_on_leg_complete() cascade;

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
        checkout_attempts,
        successful_checkouts,
        high_finish,
        finishes_100_plus
      )
      values (
        new.match_id,
        new.winner_player_number,
        1,  -- At least 1 attempt if successful
        1,  -- First successful checkout
        new.winning_checkout,
        case when new.winning_checkout >= 100 then 1 else 0 end
      )
      on conflict (match_id, player_number) do update set
        checkout_attempts = topdarter.match_stats.checkout_attempts + 1,  -- FIX: Must increment!
        successful_checkouts = topdarter.match_stats.successful_checkouts + 1,
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
      winner_player_number = coalesce(winner, winner_player_number),
      match_status = case when winner is not null then 'completed' else match_status end,
      completed_at = case when winner is not null then now() else completed_at end
    where id = new.match_id;

  end if;

  return new;
end;
$$;

-- Recreate trigger
create trigger trigger_update_match_on_leg_complete
  after insert or update on topdarter.match_legs
  for each row
  execute function public.update_match_on_leg_complete();

comment on function public.update_match_on_leg_complete() is 
  'Updates match state when leg completes (FIXED: checkout_attempts in UPDATE)';

-- =====================================================================
-- Migration Summary
-- =====================================================================
-- Fixed: Added checkout_attempts increment to ON CONFLICT UPDATE clause
-- Impact: Successful checkouts will now correctly maintain the constraint
--         successful_checkouts <= checkout_attempts
-- =====================================================================
