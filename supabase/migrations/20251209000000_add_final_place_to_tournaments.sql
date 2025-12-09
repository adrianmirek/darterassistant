-- Add final_place column to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS final_place INTEGER CHECK (final_place > 0);

-- Backfill existing tournaments with null (optional field)
UPDATE tournaments
SET final_place = NULL
WHERE final_place IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN tournaments.final_place IS 'The final placement of the player in the tournament (e.g., 1 for first place, 2 for second place)';

