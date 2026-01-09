-- =====================================================================
-- Migration: Add opponent statistics to player_match_result type
-- Purpose: Include opponent's statistics in match results
-- Date: 2026-01-07
-- =====================================================================

-- Drop existing type (cascade will drop dependent functions)
DROP TYPE IF EXISTS nakka.player_match_result CASCADE;

-- Recreate type with opponent statistics
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
  
  -- Opponent statistics (from tournament_match_player_results)
  opponent_average_score NUMERIC,
  opponent_first_nine_avg NUMERIC,
  opponent_checkout_percentage NUMERIC,
  opponent_score_60_count INTEGER,
  opponent_score_100_count INTEGER,
  opponent_score_140_count INTEGER,
  opponent_score_180_count INTEGER,
  opponent_high_finish INTEGER,
  opponent_best_leg INTEGER,
  opponent_worst_leg INTEGER,
  
  -- Metadata
  imported_at TIMESTAMPTZ
);

-- Recreate function: get_player_matches_by_nickname with opponent stats
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
    
  FROM match_data md
  LEFT JOIN nakka.tournament_match_player_results pr 
    ON pr.tournament_match_id = md.tournament_match_id
    AND pr.nakka_match_player_identifier = (
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.player_code
    )
  LEFT JOIN nakka.tournament_match_player_results opr 
    ON opr.tournament_match_id = md.tournament_match_id
    AND opr.nakka_match_player_identifier = (
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.opponent_code
    )
  ORDER BY md.tournament_date DESC, md.tournament_match_id DESC;
END;
$$;

-- Recreate function: get_player_matches_by_tournament_and_nickname with opponent stats
CREATE OR REPLACE FUNCTION nakka.get_player_matches_by_tournament_and_nickname(
  tournament_nakka_identifier TEXT,
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
      t.nakka_identifier = tournament_nakka_identifier
      AND (
        tm.first_player_name ILIKE '%' || search_nickname || '%'
        OR tm.second_player_name ILIKE '%' || search_nickname || '%'
      )
    ORDER BY tm.tournament_match_id DESC
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
    
  FROM match_data md
  LEFT JOIN nakka.tournament_match_player_results pr 
    ON pr.tournament_match_id = md.tournament_match_id
    AND pr.nakka_match_player_identifier = (
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.player_code
    )
  LEFT JOIN nakka.tournament_match_player_results opr 
    ON opr.tournament_match_id = md.tournament_match_id
    AND opr.nakka_match_player_identifier = (
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.opponent_code
    )
  ORDER BY md.tournament_match_id DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION nakka.get_player_matches_by_nickname(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) TO authenticated, anon;

-- Add comments
COMMENT ON TYPE nakka.player_match_result IS 
'Result type for player match queries. Contains tournament and match data with the searched player always in the "player" position. Includes statistics for both player and opponent.';

COMMENT ON FUNCTION nakka.get_player_matches_by_nickname(TEXT, INTEGER) IS 
'Retrieves matches for a player filtered by nickname. The matched player is always returned as "player" (first position). Results are ordered by tournament date descending and limited to the specified number (default 30). Includes statistics for both player and opponent when available.';

COMMENT ON FUNCTION nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) IS 
'Retrieves matches for a player filtered by tournament nakka_identifier and nickname. The matched player is always returned as "player" (first position). Includes statistics for both player and opponent when available.';

