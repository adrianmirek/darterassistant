-- =====================================================================
-- Migration: Fix Leg Completion Trigger
-- =====================================================================
-- Purpose: Add trigger for INSERT operations on match_legs
--          The original trigger only fired on UPDATE, but when a
--          winning throw is first recorded, it's an INSERT operation
-- 
-- Issue: Winner fields (winner_player_number, winning_checkout) are
--        set during INSERT of the winning throw, but the trigger
--        only fires on UPDATE, so legs_won never increments
-- 
-- Solution: Drop existing trigger and recreate to fire on both
--           INSERT and UPDATE operations
-- 
-- Dependencies: 20260119120200_create_topdarter_functions_and_triggers.sql
-- Created: 2026-01-31
-- =====================================================================

-- Drop existing UPDATE-only trigger
drop trigger if exists trigger_update_match_on_leg_complete on topdarter.match_legs;

-- Recreate trigger to fire on BOTH INSERT and UPDATE
create trigger trigger_update_match_on_leg_complete
  after insert or update on topdarter.match_legs
  for each row
  execute function public.update_match_on_leg_complete();

comment on trigger trigger_update_match_on_leg_complete on topdarter.match_legs is
  'Updates match state and checks for match winner when leg completes (INSERT or UPDATE)';

-- =====================================================================
-- Migration Summary
-- =====================================================================
-- Fixed: Leg completion trigger now fires on INSERT operations
-- Impact: Legs won counters will now increment correctly when a
--         player finishes a leg for the first time
-- =====================================================================
