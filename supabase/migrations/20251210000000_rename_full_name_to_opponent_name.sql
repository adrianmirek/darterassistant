-- =====================================================================
-- Migration: Rename full_name to opponent_name and remove opponent_id
-- Purpose: Simplify opponent tracking to use only free-text names
-- Affected Objects:
--   - Tables: tournament_match_results
-- =====================================================================

-- Rename full_name column to opponent_name
ALTER TABLE tournament_match_results
  RENAME COLUMN full_name TO opponent_name;

-- Drop foreign key constraint on opponent_id
ALTER TABLE tournament_match_results
  DROP CONSTRAINT IF EXISTS fk_opponent_user;

-- Drop opponent_id column
ALTER TABLE tournament_match_results
  DROP COLUMN IF EXISTS opponent_id;

-- Add comment for documentation
COMMENT ON COLUMN tournament_match_results.opponent_name IS 'Free-text name of the opponent player in the match';

