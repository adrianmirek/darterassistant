-- =====================================================================
-- Migration: Grant INSERT permissions to anon role for Nakka tables
-- Purpose: Allow guest users to save tournament data via public API
-- Date: 2026-01-06
-- =====================================================================

-- Grant INSERT permission on nakka.tournaments to anon role
GRANT INSERT ON nakka.tournaments TO anon;
GRANT UPDATE ON nakka.tournaments TO anon;

-- Grant INSERT permission on nakka.tournament_matches to anon role
GRANT INSERT ON nakka.tournament_matches TO anon;
GRANT UPDATE ON nakka.tournament_matches TO anon;

GRANT INSERT ON nakka.tournament_match_player_results TO anon;
GRANT UPDATE ON nakka.tournament_match_player_results TO anon;

-- Grant USAGE permission on sequences for anon role (required for SERIAL primary keys)
GRANT USAGE, SELECT ON SEQUENCE nakka.tournaments_tournament_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE nakka.tournament_matches_tournament_match_id_seq TO anon;

-- Grant permissions on tournament_match_player_results sequence
-- The sequence name is auto-truncated by PostgreSQL to fit 63-char limit
DO $$
DECLARE
  seq_name TEXT;
BEGIN
  SELECT pg_get_serial_sequence('nakka.tournament_match_player_results', 'tournament_match_player_result_id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO anon', seq_name);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE nakka.tournaments IS 'Stores tournament metadata imported from Nakka 01 platform (n01darts.com). Public INSERT allowed for guest users.';
COMMENT ON TABLE nakka.tournament_matches IS 'Stores match data for tournaments imported from Nakka 01 platform. Public INSERT allowed for guest users.';

