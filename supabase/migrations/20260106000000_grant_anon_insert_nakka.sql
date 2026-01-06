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

-- Grant USAGE permission on sequences for anon role (required for SERIAL primary keys)
GRANT USAGE, SELECT ON SEQUENCE nakka.tournaments_tournament_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE nakka.tournament_matches_tournament_match_id_seq TO anon;

-- Add comments
COMMENT ON TABLE nakka.tournaments IS 'Stores tournament metadata imported from Nakka 01 platform (n01darts.com). Public INSERT allowed for guest users.';
COMMENT ON TABLE nakka.tournament_matches IS 'Stores match data for tournaments imported from Nakka 01 platform. Public INSERT allowed for guest users.';

