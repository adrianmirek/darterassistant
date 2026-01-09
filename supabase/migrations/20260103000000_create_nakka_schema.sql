-- =====================================================================
-- Migration: Create Nakka Schema and Tables
-- Purpose: Store tournament data imported from Nakka 01 platform
-- Date: 2026-01-03
-- =====================================================================

-- Create nakka schema
CREATE SCHEMA IF NOT EXISTS nakka;

-- Create tournaments table in nakka schema
CREATE TABLE IF NOT EXISTS nakka.tournaments (
  -- Primary key
  tournament_id SERIAL PRIMARY KEY,
  
  -- Nakka-specific identifier (unique constraint)
  nakka_identifier TEXT NOT NULL UNIQUE,
  
  -- Tournament metadata
  tournament_date TIMESTAMPTZ NOT NULL,
  tournament_name TEXT NOT NULL,
  href TEXT NOT NULL,
  
  -- Import metadata
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status tracking for future match imports
  match_import_status TEXT 
    CHECK (match_import_status IN ('in_progress', 'completed', 'failed')),
  match_import_error TEXT,
  
  -- Constraints
  CONSTRAINT valid_date CHECK (tournament_date <= NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_date 
  ON nakka.tournaments (tournament_date DESC);

CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_identifier 
  ON nakka.tournaments (nakka_identifier);

CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_status 
  ON nakka.tournaments (match_import_status) 
  WHERE match_import_status IS NOT NULL;

-- Add comments
COMMENT ON TABLE nakka.tournaments IS 'Stores tournament metadata imported from Nakka 01 platform (n01darts.com)';
COMMENT ON COLUMN nakka.tournaments.nakka_identifier IS 'Unique identifier from Nakka platform (e.g., t_WWGB_9024)';
COMMENT ON COLUMN nakka.tournaments.match_import_status IS 'Tracks whether match-level data has been imported for this tournament (NULL = not started, in_progress, completed, failed)';

-- Grant permissions
-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA nakka TO anon, authenticated;

-- Grant permissions on the tournaments table
GRANT SELECT, INSERT, UPDATE ON nakka.tournaments TO authenticated;
GRANT SELECT ON nakka.tournaments TO anon;

-- Grant permissions on the sequence (for SERIAL primary key)
GRANT USAGE, SELECT ON SEQUENCE nakka.tournaments_tournament_id_seq TO authenticated;

