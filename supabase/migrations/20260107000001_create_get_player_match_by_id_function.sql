-- =====================================================================
-- Migration: Create function to retrieve a single player match by ID
-- Purpose: Retrieve a single match by tournament_match_id with player statistics
-- Date: 2026-01-07
-- =====================================================================

-- Function to retrieve a single match by tournament_match_id and nickname
-- Returns the match with the matched player always as "player" (first position)
-- Includes player statistics if available in tournament_match_player_results
CREATE OR REPLACE FUNCTION nakka.get_player_match_by_id_and_nickname(
  match_id INTEGER,
  search_nickname TEXT
)
RETURNS nakka.player_match_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result nakka.player_match_result;
BEGIN
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
      tm.tournament_match_id = match_id
      AND (
        tm.first_player_name ILIKE '%' || search_nickname || '%'
        OR tm.second_player_name ILIKE '%' || search_nickname || '%'
      )
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
    
    -- Player statistics
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
    
    -- Opponent statistics
    opr.average_score AS opponent_average_score,
    opr.first_nine_avg AS opponent_first_nine_avg,
    opr.checkout_percentage AS opponent_checkout_percentage,
    opr.score_60_count AS opponent_score_60_count,
    opr.score_100_count AS opponent_score_100_count,
    opr.score_140_count AS opponent_score_140_count,
    opr.score_180_count AS opponent_score_180_count,
    opr.high_finish AS opponent_high_finish,
    opr.best_leg AS opponent_best_leg,
    opr.worst_leg AS opponent_worst_leg,
    
    md.imported_at
    
  INTO result
  FROM match_data md
  LEFT JOIN nakka.tournament_match_player_results pr 
    ON pr.tournament_match_id = md.tournament_match_id
    AND pr.nakka_match_player_identifier = (
      -- Construct player identifier: {tournamentId}_{matchType}_{round}_{playerCode}
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.player_code
    )
  LEFT JOIN nakka.tournament_match_player_results opr 
    ON opr.tournament_match_id = md.tournament_match_id
    AND opr.nakka_match_player_identifier = (
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.opponent_code
    );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION nakka.get_player_match_by_id_and_nickname(INTEGER, TEXT) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION nakka.get_player_match_by_id_and_nickname(INTEGER, TEXT) IS 
'Retrieves a single match by tournament_match_id filtered by nickname. The matched player is always returned as "player" (first position). Returns null if match not found or nickname does not match.';

