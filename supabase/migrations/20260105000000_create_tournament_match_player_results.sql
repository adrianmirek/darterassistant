-- =====================================================================
-- Migration: Create Tournament Match Player Results Table
-- Purpose: Store individual player statistics for each match
-- Date: 2026-01-05
-- =====================================================================

-- Create tournament_match_player_results table in nakka schema
CREATE TABLE IF NOT EXISTS nakka.tournament_match_player_results (
  -- Primary key
  tournament_match_player_result_id SERIAL PRIMARY KEY,
  
  -- Foreign key to tournament_matches table
  tournament_match_id INTEGER NOT NULL REFERENCES nakka.tournament_matches(tournament_match_id) ON DELETE CASCADE,
  
  -- Unique identifier for this player in this match
  nakka_match_player_identifier TEXT NOT NULL,
  
  -- Player statistics
  average_score NUMERIC(5,2),
  first_nine_avg NUMERIC(5,2),
  checkout_percentage NUMERIC(5,2),
  score_60_count INTEGER DEFAULT 0 CHECK (score_60_count >= 0),
  score_100_count INTEGER DEFAULT 0 CHECK (score_100_count >= 0),
  score_140_count INTEGER DEFAULT 0 CHECK (score_140_count >= 0),
  score_180_count INTEGER DEFAULT 0 CHECK (score_180_count >= 0),
  high_finish INTEGER DEFAULT 0 CHECK (high_finish >= 0),
  best_leg INTEGER DEFAULT 0 CHECK (best_leg >= 0),
  worst_leg INTEGER DEFAULT 0 CHECK (worst_leg >= 0),
  player_score INTEGER DEFAULT 0 CHECK (player_score >= 0),
  opponent_score INTEGER DEFAULT 0 CHECK (opponent_score >= 0),
  
  -- Import metadata
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_player_result UNIQUE (tournament_match_id, nakka_match_player_identifier)
);

-- Create indexes for common queries
CREATE INDEX idx_tournament_match_player_results_match_id 
  ON nakka.tournament_match_player_results(tournament_match_id);

CREATE INDEX idx_tournament_match_player_results_identifier 
  ON nakka.tournament_match_player_results(nakka_match_player_identifier);

-- Add comments
COMMENT ON TABLE nakka.tournament_match_player_results IS 'Stores individual player statistics for each match from Nakka 01 platform';
COMMENT ON COLUMN nakka.tournament_match_player_results.nakka_match_player_identifier IS 'Unique identifier for player in match (e.g., t_Nd6M_9511_rr_2_3Tm2)';
COMMENT ON COLUMN nakka.tournament_match_player_results.average_score IS 'Player average score for the match';
COMMENT ON COLUMN nakka.tournament_match_player_results.checkout_percentage IS 'Checkout percentage (0-100)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON nakka.tournament_match_player_results TO authenticated;
GRANT SELECT ON nakka.tournament_match_player_results TO anon;

-- Grant permissions on the sequence (for SERIAL primary key)
-- The sequence name is auto-truncated by PostgreSQL to fit 63-char limit
-- Find and grant on the actual sequence created
DO $$
DECLARE
  seq_name TEXT;
BEGIN
  SELECT pg_get_serial_sequence('nakka.tournament_match_player_results', 'tournament_match_player_result_id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', seq_name);
  END IF;
END $$;

