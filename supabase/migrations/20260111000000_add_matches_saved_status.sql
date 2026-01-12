-- =====================================================================
-- Migration: Add 'matches_saved' Status to Tournament Import Status
-- Purpose: Allow tournaments to track when all matches are saved (before results import)
-- Date: 2026-01-11
-- =====================================================================
-- Description:
-- Adds 'matches_saved' as a valid value for match_import_status.
-- This status indicates that all tournament matches have been saved to the database,
-- but player results haven't been imported yet.
-- 
-- Status Flow:
-- NULL -> matches_saved -> in_progress -> completed/failed
--   |                                          ^
--   +------------------------------------------+
-- =====================================================================

-- Drop the existing check constraint
ALTER TABLE nakka.tournaments 
  DROP CONSTRAINT IF EXISTS tournaments_match_import_status_check;

-- Add the new check constraint with 'matches_saved' included
ALTER TABLE nakka.tournaments
  ADD CONSTRAINT tournaments_match_import_status_check
  CHECK (match_import_status IN ('matches_saved', 'in_progress', 'completed', 'failed'));

-- Add comment explaining the status values
COMMENT ON COLUMN nakka.tournaments.match_import_status IS 
'Status of match import process:
- NULL: Tournament saved, no matches processed yet
- matches_saved: All matches saved to database (NEW)
- in_progress: Match results import in progress or partial
- completed: All match results successfully imported
- failed: Match results import failed';

-- =====================================================================
-- Update the automatic status calculation function to respect 'matches_saved'
-- =====================================================================
-- The existing trigger would override 'matches_saved' status.
-- We need to update it to only calculate status based on match_result_status
-- when match results are actually being processed.

CREATE OR REPLACE FUNCTION nakka.calculate_tournament_match_import_status(p_tournament_id INTEGER)
RETURNS TABLE(
  new_status TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_total_matches INTEGER;
  v_completed_matches INTEGER;
  v_failed_matches INTEGER;
  v_in_progress_matches INTEGER;
  v_current_status TEXT;
  v_status TEXT;
  v_error TEXT;
BEGIN
  -- Get current status
  SELECT match_import_status INTO v_current_status
  FROM nakka.tournaments
  WHERE tournament_id = p_tournament_id;

  -- Count matches by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE match_result_status = 'completed'),
    COUNT(*) FILTER (WHERE match_result_status = 'failed'),
    COUNT(*) FILTER (WHERE match_result_status = 'in_progress')
  INTO 
    v_total_matches,
    v_completed_matches,
    v_failed_matches,
    v_in_progress_matches
  FROM nakka.tournament_matches
  WHERE tournament_id = p_tournament_id;
  
  -- Determine status based on match statuses
  IF v_total_matches = 0 THEN
    -- No matches yet - keep NULL
    v_status := NULL;
    v_error := NULL;
    
  -- If current status is 'matches_saved' and no results processing has started,
  -- keep it as matches_saved (don't override it)
  ELSIF v_current_status = 'matches_saved' 
        AND v_completed_matches = 0 
        AND v_failed_matches = 0 
        AND v_in_progress_matches = 0 THEN
    v_status := 'matches_saved';
    v_error := NULL;
    
  ELSIF v_failed_matches > 0 THEN
    -- At least one match failed - tournament is failed
    v_status := 'failed';
    v_error := format('%s of %s matches failed to import player results', 
                      v_failed_matches, v_total_matches);
    
  ELSIF v_completed_matches = v_total_matches THEN
    -- All matches completed - tournament is completed
    v_status := 'completed';
    v_error := NULL;
    
  ELSE
    -- Some matches still in progress or not started (but at least one has status)
    v_status := 'in_progress';
    v_error := NULL;
    
  END IF;
  
  RETURN QUERY SELECT v_status, v_error;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION nakka.calculate_tournament_match_import_status IS 
'Calculates tournament match_import_status based on the status of all its matches. 
Respects matches_saved status when no match results processing has started.';

