-- =====================================================================
-- Migration: Add Match Result Status to Tournament Matches
-- Purpose: Track player result import status for each match
-- Date: 2026-01-05
-- =====================================================================

-- Add match_result_status column to tournament_matches table
ALTER TABLE nakka.tournament_matches
  ADD COLUMN IF NOT EXISTS match_result_status TEXT 
    CHECK (match_result_status IN ('in_progress', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS match_result_error TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_tournament_matches_result_status 
  ON nakka.tournament_matches (match_result_status) 
  WHERE match_result_status IS NOT NULL;

-- Add comments
COMMENT ON COLUMN nakka.tournament_matches.match_result_status IS 'Tracks whether player-level statistics have been imported for this match (NULL = not started, in_progress, completed, failed)';
COMMENT ON COLUMN nakka.tournament_matches.match_result_error IS 'Error message if match_result_status is failed';

