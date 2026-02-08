-- =====================================================================
-- Migration: Add accent-insensitive search support for Polish characters
-- Purpose: Enable searches to work with or without Polish diacritics (ł, ą, ć, ę, ń, ó, ś, ź, ż)
-- Date: 2026-02-08
-- =====================================================================

-- Create a function to normalize Polish text (remove diacritics)
CREATE OR REPLACE FUNCTION nakka.normalize_polish_text(text_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF text_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert to lowercase and replace Polish characters with their ASCII equivalents
  -- Handle both lowercase and uppercase Polish characters
  RETURN LOWER(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      text_input,
      'Ą', 'a'), 'ą', 'a'), 'Ć', 'c'), 'ć', 'c'), 'Ę', 'e'), 'ę', 'e'), 
      'Ł', 'l'), 'ł', 'l'), 'Ń', 'n'), 'ń', 'n'), 'Ó', 'o'), 'ó', 'o'), 
      'Ś', 's'), 'ś', 's'), 'Ź', 'z'), 'ź', 'z'), 'Ż', 'z'), 'ż', 'z')
  );
END;
$$;

COMMENT ON FUNCTION nakka.normalize_polish_text(TEXT) IS 
'Normalizes Polish text by converting to lowercase and replacing Polish diacritics with ASCII equivalents. Used for accent-insensitive searches.';

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION nakka.normalize_polish_text(TEXT) TO authenticated, anon;

-- =====================================================================
-- Update get_player_matches_by_nickname to use normalized comparison
-- =====================================================================

DROP FUNCTION IF EXISTS nakka.get_player_matches_by_nickname(TEXT[], INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION nakka.get_player_matches_by_nickname(
  search_nicknames TEXT[],
  match_limit INTEGER DEFAULT 30
)
RETURNS SETOF nakka.player_match_result
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input: ensure array is not empty
  IF search_nicknames IS NULL OR array_length(search_nicknames, 1) IS NULL THEN
    RAISE EXCEPTION 'search_nicknames array cannot be empty';
  END IF;

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
      -- Check if second player matches any nickname but first player doesn't
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        ) AND NOT EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        )
        THEN tm.second_player_name
        ELSE tm.first_player_name
      END AS player_name,
      
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        ) AND NOT EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        )
        THEN tm.second_player_code
        ELSE tm.first_player_code
      END AS player_code,
      
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        ) AND NOT EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        )
        THEN tm.first_player_name
        ELSE tm.second_player_name
      END AS opponent_name,
      
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        ) AND NOT EXISTS (
          SELECT 1 FROM unnest(search_nicknames) AS nickname
          WHERE nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
        )
        THEN tm.first_player_code
        ELSE tm.second_player_code
      END AS opponent_code,
      
      tm.imported_at
      
    FROM nakka.tournament_matches tm
    INNER JOIN nakka.tournaments t ON tm.tournament_id = t.tournament_id
    WHERE 
      -- Match if ANY nickname is found in either player name (accent-insensitive)
      EXISTS (
        SELECT 1 FROM unnest(search_nicknames) AS nickname
        WHERE nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
           OR nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(nickname) || '%'
      )
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
      -- Construct player identifier: {tournamentId}_{matchType}_{round}_{playerCode}
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.player_code
    )
  LEFT JOIN nakka.tournament_match_player_results opr 
    ON opr.tournament_match_id = md.tournament_match_id
    AND opr.nakka_match_player_identifier = (
      -- Construct opponent identifier: {tournamentId}_{matchType}_{round}_{opponentCode}
      REGEXP_REPLACE(md.nakka_match_identifier, '_[^_]+_[^_]+$', '') || '_' || md.opponent_code
    )
  ORDER BY md.tournament_date DESC, md.tournament_match_id DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION nakka.get_player_matches_by_nickname(TEXT[], INTEGER) TO authenticated, anon;

COMMENT ON FUNCTION nakka.get_player_matches_by_nickname(TEXT[], INTEGER) IS 
'Retrieves matches for a player filtered by multiple nicknames (array). Uses accent-insensitive matching for Polish characters. Returns matches where ANY of the provided nicknames is found in either player name. The matched player is always returned as "player" (first position). Results are ordered by tournament date descending and limited to the specified number (default 30).';

-- =====================================================================
-- Update get_player_matches_by_tournament_and_nickname to use normalized comparison
-- =====================================================================

DROP FUNCTION IF EXISTS nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION nakka.get_player_matches_by_tournament_and_nickname(
  search_tournament_keyword TEXT,
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
        WHEN nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
             AND NOT nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
        THEN tm.second_player_name
        ELSE tm.first_player_name
      END AS player_name,
      
      CASE 
        WHEN nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
             AND NOT nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
        THEN tm.second_player_code
        ELSE tm.first_player_code
      END AS player_code,
      
      CASE 
        WHEN nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
             AND NOT nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
        THEN tm.first_player_name
        ELSE tm.second_player_name
      END AS opponent_name,
      
      CASE 
        WHEN nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
             AND NOT nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
        THEN tm.first_player_code
        ELSE tm.second_player_code
      END AS opponent_code,
      
      tm.imported_at
      
    FROM nakka.tournament_matches tm
    INNER JOIN nakka.tournaments t ON tm.tournament_id = t.tournament_id
    WHERE 
      -- Filter by tournament keyword (accent-insensitive)
      nakka.normalize_polish_text(t.tournament_name) LIKE '%' || nakka.normalize_polish_text(search_tournament_keyword) || '%'
      -- Match if nickname is found in either player name (accent-insensitive)
      AND (
        nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
        OR nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
      )
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

GRANT EXECUTE ON FUNCTION nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) TO authenticated, anon;

COMMENT ON FUNCTION nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) IS 
'Retrieves matches for a player filtered by tournament keyword and nickname. Uses accent-insensitive matching for Polish characters. Returns matches where the nickname is found in either player name within tournaments matching the keyword. The matched player is always returned as "player" (first position). Results are ordered by tournament date descending and limited to the specified number (default 30).';
