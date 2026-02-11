-- =====================================================================
-- Migration: Add attempts_count column to tournament_matches
-- Purpose: Track number of insert/update attempts and auto-delete after 10
-- Date: 2026-02-11
-- =====================================================================

-- Step 1: Add attempts_count column to tournament_matches table
ALTER TABLE nakka.tournament_matches
ADD COLUMN attempts_count INTEGER NOT NULL DEFAULT 1;

-- Step 2: Create a trigger function to increment attempts_count on update
CREATE OR REPLACE FUNCTION nakka.increment_attempts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Increment the attempts_count by 1 on every update
  NEW.attempts_count := OLD.attempts_count + 1;
  RETURN NEW;
END;
$$;

-- Step 3: Create a BEFORE UPDATE trigger to increment attempts_count
CREATE TRIGGER trigger_increment_attempts_count
BEFORE UPDATE ON nakka.tournament_matches
FOR EACH ROW
EXECUTE FUNCTION nakka.increment_attempts_count();

-- Step 4: Create a trigger function to delete rows when attempts_count reaches 10
CREATE OR REPLACE FUNCTION nakka.delete_high_attempt_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If attempts_count has reached 10 or more, delete the row
  IF NEW.attempts_count >= 10 THEN
    DELETE FROM nakka.tournament_matches 
    WHERE tournament_match_id = NEW.tournament_match_id;
    -- Return NULL to prevent the update from completing (row is already deleted)
    RETURN NULL;
  END IF;
  
  -- Otherwise, allow the update to proceed
  RETURN NEW;
END;
$$;

-- Step 5: Create an AFTER UPDATE trigger to delete rows with high attempt counts
CREATE TRIGGER trigger_delete_high_attempt_matches
AFTER UPDATE ON nakka.tournament_matches
FOR EACH ROW
WHEN (NEW.attempts_count >= 10)
EXECUTE FUNCTION nakka.delete_high_attempt_matches();

-- Step 6: Add comment to the column
COMMENT ON COLUMN nakka.tournament_matches.attempts_count IS 
'Counter for the number of insert/update attempts. Starts at 1 on insert, increments by 1 on each update. Row is automatically deleted when this reaches 10.';

-- Step 7: Add comments to functions
COMMENT ON FUNCTION nakka.increment_attempts_count() IS 
'Trigger function that increments the attempts_count column by 1 on every update of a tournament_matches row.';

COMMENT ON FUNCTION nakka.delete_high_attempt_matches() IS 
'Trigger function that automatically deletes tournament_matches rows when attempts_count reaches 10 or more.';
