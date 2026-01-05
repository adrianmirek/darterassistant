-- =====================================================================
-- Migration: Auto-update Tournament Match Import Status
-- Purpose: Make match_import_status reflect actual completion of all matches
-- Date: 2026-01-05
-- =====================================================================
-- Description:
-- Previously, tournaments were marked as 'completed' immediately after
-- match import, even if player results weren't fully imported.
-- This migration creates a trigger system that automatically computes
-- match_import_status based on the actual status of all tournament matches:
-- - 'completed': ALL matches have match_result_status = 'completed'
-- - 'failed': ANY match has match_result_status = 'failed'
-- - 'in_progress': Some matches exist and at least one is not completed
-- - NULL: No matches exist yet
-- =====================================================================

-- Function to calculate tournament match_import_status based on matches
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
  v_status TEXT;
  v_error TEXT;
BEGIN
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
    -- No matches yet - status should be NULL or in_progress if match import is happening
    v_status := NULL;
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
    -- Some matches still in progress or not started
    v_status := 'in_progress';
    v_error := NULL;
    
  END IF;
  
  RETURN QUERY SELECT v_status, v_error;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION nakka.calculate_tournament_match_import_status IS 'Calculates tournament match_import_status based on the status of all its matches';

-- Trigger function to auto-update tournament status when matches change
CREATE OR REPLACE FUNCTION nakka.update_tournament_status_on_match_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tournament_id INTEGER;
  v_new_status TEXT;
  v_new_error TEXT;
BEGIN
  -- Get tournament_id (works for both INSERT/UPDATE and DELETE)
  IF TG_OP = 'DELETE' THEN
    v_tournament_id := OLD.tournament_id;
  ELSE
    v_tournament_id := NEW.tournament_id;
  END IF;
  
  -- Calculate new status
  SELECT new_status, error_message
  INTO v_new_status, v_new_error
  FROM nakka.calculate_tournament_match_import_status(v_tournament_id);
  
  -- Update tournament status
  UPDATE nakka.tournaments
  SET 
    match_import_status = v_new_status,
    match_import_error = v_new_error,
    last_updated = NOW()
  WHERE tournament_id = v_tournament_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION nakka.update_tournament_status_on_match_change IS 'Trigger function that updates tournament match_import_status when match statuses change';

-- Create trigger on tournament_matches
DROP TRIGGER IF EXISTS trigger_update_tournament_status ON nakka.tournament_matches;

CREATE TRIGGER trigger_update_tournament_status
  AFTER INSERT OR UPDATE OF match_result_status OR DELETE
  ON nakka.tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION nakka.update_tournament_status_on_match_change();

-- Add comment
COMMENT ON TRIGGER trigger_update_tournament_status ON nakka.tournament_matches IS 'Automatically updates tournament match_import_status when matches are inserted, updated, or deleted';
