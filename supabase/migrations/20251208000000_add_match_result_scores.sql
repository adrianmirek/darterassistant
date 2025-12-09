-- Add player_score and opponent_score columns to tournament_match_results
ALTER TABLE tournament_match_results
  ADD COLUMN IF NOT EXISTS player_score INTEGER NOT NULL DEFAULT 0 CHECK (player_score >= 0),
  ADD COLUMN IF NOT EXISTS opponent_score INTEGER NOT NULL DEFAULT 0 CHECK (opponent_score >= 0);

-- Backfill existing match results with default values (0)
UPDATE tournament_match_results
SET player_score = 0, opponent_score = 0
WHERE player_score IS NULL OR opponent_score IS NULL;

