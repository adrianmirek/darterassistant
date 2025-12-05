-- Create lookup table for tournament types
CREATE TABLE IF NOT EXISTS tournament_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Seed initial tournament types
INSERT INTO tournament_types (name) VALUES
  ('Leagues + SKO'),
  ('SKO')
ON CONFLICT (name) DO NOTHING;

-- Add nullable tournament_type_id to tournament
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS tournament_type_id INTEGER;

-- Backfill existing tournaments with default type (assumes id=1 exists)
UPDATE tournaments SET tournament_type_id = 1 WHERE tournament_type_id IS NULL;

-- Alter tournament_type_id to NOT NULL and add foreign key constraint
ALTER TABLE tournaments
  ALTER COLUMN tournament_type_id SET NOT NULL;
ALTER TABLE tournaments
  ADD CONSTRAINT fk_tournament_type
  FOREIGN KEY (tournament_type_id)
  REFERENCES tournament_types(id);

-- Add nullable opponent_id and full_name to tournament_match_results
ALTER TABLE tournament_match_results
  ADD COLUMN IF NOT EXISTS opponent_id UUID,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Backfill existing match results
UPDATE tournament_match_results
SET opponent_id = NULL, full_name = NULL;

-- Add foreign key constraint on opponent_id
ALTER TABLE tournament_match_results
  ADD CONSTRAINT fk_opponent_user
  FOREIGN KEY (opponent_id)
  REFERENCES auth.users(id);
