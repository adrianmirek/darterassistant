-- =====================================================================
-- Migration: Create Tournament Matches Table
-- Purpose: Store match data for tournaments imported from Nakka 01
-- Date: 2026-01-04
-- =====================================================================

-- Create tournament_matches table in nakka schema
CREATE TABLE IF NOT EXISTS nakka.tournament_matches (
  -- Primary key
  tournament_match_id SERIAL PRIMARY KEY,
  
  -- Foreign key to tournaments table
  tournament_id INTEGER NOT NULL REFERENCES nakka.tournaments(tournament_id) ON DELETE CASCADE,
  
  -- Match metadata
  nakka_match_identifier TEXT NOT NULL,
  match_type TEXT NOT NULL,
  
  -- Player information
  first_player_name TEXT NOT NULL,
  first_player_code TEXT NOT NULL,
  second_player_name TEXT NOT NULL,
  second_player_code TEXT NOT NULL,
  
  -- Match URL
  href TEXT NOT NULL,
  
  -- Import metadata
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_match_per_tournament UNIQUE (tournament_id, nakka_match_identifier)
);

-- Create indexes for common queries
CREATE INDEX idx_tournament_matches_tournament_id 
  ON nakka.tournament_matches(tournament_id);

CREATE INDEX idx_tournament_matches_match_type 
  ON nakka.tournament_matches(match_type);

CREATE INDEX idx_tournament_matches_identifier 
  ON nakka.tournament_matches(nakka_match_identifier);

-- Add comments
COMMENT ON TABLE nakka.tournament_matches IS 'Stores match data for tournaments imported from Nakka 01 platform';
COMMENT ON COLUMN nakka.tournament_matches.nakka_match_identifier IS 'Unique identifier from Nakka platform extracted from match URL (e.g., t_Nd6M_9511_rr_0_ygC9_zJGq)';
COMMENT ON COLUMN nakka.tournament_matches.match_type IS 'Type of match: rr for round-robin, t_* for knockout stages (e.g., t_top_16, t_quarter_final)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON nakka.tournament_matches TO authenticated;
GRANT SELECT ON nakka.tournament_matches TO anon;

-- Grant permissions on the sequence (for SERIAL primary key)
GRANT USAGE, SELECT ON SEQUENCE nakka.tournament_matches_tournament_match_id_seq TO authenticated;

