-- =====================================================================
-- Migration: Create function to retrieve player matches from database
-- Purpose: Retrieve top 30 matches for a player by nickname (Guest view)
-- Date: 2026-01-06
-- =====================================================================

-- Create a type for the match result that includes player-oriented data
CREATE TYPE nakka.player_match_result AS (
  -- Tournament info
  tournament_id INTEGER,
  nakka_tournament_identifier TEXT,
  tournament_name TEXT,
  tournament_date TIMESTAMPTZ,
  tournament_href TEXT,
  
  -- Match info
  tournament_match_id INTEGER,
  nakka_match_identifier TEXT,
  match_type TEXT,
  match_href TEXT,
  
  -- Player-oriented match data (matched player is always "player")
  player_name TEXT,
  player_code TEXT,
  opponent_name TEXT,
  opponent_code TEXT,
  
  -- Player statistics (from tournament_match_player_results)
  average_score NUMERIC,
  first_nine_avg NUMERIC,
  checkout_percentage NUMERIC,
  score_60_count INTEGER,
  score_100_count INTEGER,
  score_140_count INTEGER,
  score_180_count INTEGER,
  high_finish INTEGER,
  best_leg INTEGER,
  worst_leg INTEGER,
  player_score INTEGER,
  opponent_score INTEGER,
  
  -- Metadata
  imported_at TIMESTAMPTZ
);

-- Function to retrieve matches for a player by nickname
-- Returns matches ordered by tournament_date DESC, limited to 30
-- The matched player is always returned as "player" (first position)
-- Includes player statistics if available in tournament_match_player_results
CREATE OR REPLACE FUNCTION nakka.get_player_matches_by_nickname(
  search_nickname TEXT,
  match_limit INTEGER DEFAULT 30
)
RETURNS SETOF nakka.player_match_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH match_data AS (
    SELECT 
      t.tournament_id,
      t.nakka_identifier AS nakka_tournament_identifier,
      t.tournament_name,
      t.tournament_date,
      t.href AS tournament_href,
      
      tm.tournament_match_id,
      tm.nakka_match_identifier,
      tm.match_type,
      tm.href AS match_href,
      
      -- Determine which player matched the search
      CASE 
        WHEN tm.second_player_name ILIKE '%' || search_nickname || '%' 
             AND NOT (tm.first_player_name ILIKE '%' || search_nickname || '%')
        THEN tm.second_player_name
        ELSE tm.first_player_name
      END AS player_name,
      
      CASE 
        WHEN tm.second_player_name ILIKE '%' || search_nickname || '%' 
             AND NOT (tm.first_player_name ILIKE '%' || search_nickname || '%')
        THEN tm.second_player_code
        ELSE tm.first_player_code
      END AS player_code,
      
      CASE 
        WHEN tm.second_player_name ILIKE '%' || search_nickname || '%' 
             AND NOT (tm.first_player_name ILIKE '%' || search_nickname || '%')
        THEN tm.first_player_name
        ELSE tm.second_player_name
      END AS opponent_name,
      
      CASE 
        WHEN tm.second_player_name ILIKE '%' || search_nickname || '%' 
             AND NOT (tm.first_player_name ILIKE '%' || search_nickname || '%')
        THEN tm.first_player_code
        ELSE tm.second_player_code
      END AS opponent_code,
      
      tm.imported_at
      
    FROM nakka.tournament_matches tm
    INNER JOIN nakka.tournaments t ON tm.tournament_id = t.tournament_id
    WHERE 
      tm.first_player_name ILIKE '%' || search_nickname || '%'
      OR tm.second_player_name ILIKE '%' || search_nickname || '%'
    ORDER BY t.tournament_date DESC, tm.tournament_match_id DESC
    LIMIT match_limit
  )
  SELECT 
    md.tournament_id,
    md.nakka_tournament_identifier,
    md.tournament_name,
    md.tournament_date,
    md.tournament_href,
    md.tournament_match_id,
    md.nakka_match_identifier,
    md.match_type,
    md.match_href,
    md.player_name,
    md.player_code,
    md.opponent_name,
    md.opponent_code,
    
    -- Join with player results using constructed identifier
    -- Player identifier format: {tournamentId}_{matchType}_{round}_{playerCode}
    -- Match identifier format: {tournamentId}_{matchType}_{round}_{code1}_{code2}
    -- Extract first N-1 parts of match identifier and append player code
    pr.average_score,
    pr.first_nine_avg,
    pr.checkout_percentage,
    pr.score_60_count,
    pr.score_100_count,
    pr.score_140_count,
    pr.score_180_count,
    pr.high_finish,
    pr.best_leg,
    pr.worst_leg,
    pr.player_score,
    pr.opponent_score,
    
    md.imported_at
    
  FROM match_data md
  LEFT JOIN nakka.tournament_match_player_results pr 
    ON pr.tournament_match_id = md.tournament_match_id
    AND pr.nakka_match_player_identifier = (
      -- Construct player identifier: {tournamentId}_{matchType}_{round}_{playerCode}
      -- Match identifier: {tournamentId}_{matchType}_{round}_{code1}_{code2}
      -- Use regex to extract all parts except last 2 player codes, then append matched player code
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.player_code
    )
  ORDER BY md.tournament_date DESC, md.tournament_match_id DESC;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION nakka.get_player_matches_by_nickname(TEXT, INTEGER) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION nakka.get_player_matches_by_nickname(TEXT, INTEGER) IS 
'Retrieves matches for a player filtered by nickname. The matched player is always returned as "player" (first position). Results are ordered by tournament date descending and limited to the specified number (default 30).';

COMMENT ON TYPE nakka.player_match_result IS 
'Result type for player match queries. Contains tournament and match data with the searched player always in the "player" position.';

