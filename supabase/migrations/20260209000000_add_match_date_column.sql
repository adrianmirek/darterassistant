-- =====================================================================
-- Migration: Add match_date column to tournament_matches
-- Purpose: Add match_date column combining tournament_date and imported_at time
-- Date: 2026-02-09
-- =====================================================================

-- Step 1: Add match_date column to tournament_matches table
ALTER TABLE nakka.tournament_matches
ADD COLUMN match_date TIMESTAMPTZ;

-- Step 2: Update existing matches with combined date from tournament_date and time from imported_at
-- Extract date part (YYYY-MM-DD) from tournaments.tournament_date
-- Extract time part (HH:MI:SS) from tournament_matches.imported_at
-- Combine them to create the match_date
WITH match_updates AS (
  SELECT 
    tm.tournament_match_id,
    (
      to_char(t.tournament_date, 'YYYY-MM-DD') || ' ' || 
      to_char(tm.imported_at, 'HH24:MI:SS')
    )::TIMESTAMPTZ AS new_match_date
  FROM nakka.tournament_matches tm
  INNER JOIN nakka.tournaments t ON tm.tournament_id = t.tournament_id
)
UPDATE nakka.tournament_matches
SET match_date = match_updates.new_match_date
FROM match_updates
WHERE tournament_matches.tournament_match_id = match_updates.tournament_match_id;

-- Step 3: Make match_date NOT NULL now that all existing records have values
ALTER TABLE nakka.tournament_matches
ALTER COLUMN match_date SET NOT NULL;

-- Step 4: Set default value for future inserts (use imported_at as default)
ALTER TABLE nakka.tournament_matches
ALTER COLUMN match_date SET DEFAULT NOW();

-- Step 5: Create index on match_date for query performance
CREATE INDEX idx_tournament_matches_match_date 
  ON nakka.tournament_matches(match_date DESC);

-- Step 6: Add comment
COMMENT ON COLUMN nakka.tournament_matches.match_date IS 'Match date/time combining tournament date with import time. Used for chronological ordering of matches.';

-- Step 7: Update the player_match_result type to include match_date
-- First, drop all existing functions that use this type
DROP FUNCTION IF EXISTS nakka.get_player_matches_by_nickname(TEXT[], INTEGER) CASCADE;
DROP FUNCTION IF EXISTS nakka.get_player_match_by_id_and_nickname(INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) CASCADE;

-- Drop and recreate the type with the new field
DROP TYPE IF EXISTS nakka.player_match_result CASCADE;

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
  match_date TIMESTAMPTZ,
  
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
  
  -- Opponent statistics
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

-- Step 8: Recreate the function with match_date ordering and accent-insensitive search
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
      tm.match_date,
      
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
    ORDER BY t.tournament_date DESC, tm.match_date DESC, tm.tournament_match_id DESC
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
    md.match_date,
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
  ORDER BY md.tournament_date DESC, md.match_date DESC, md.tournament_match_id DESC;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION nakka.get_player_matches_by_nickname(TEXT[], INTEGER) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION nakka.get_player_matches_by_nickname(TEXT[], INTEGER) IS 
'Retrieves matches for a player filtered by multiple nicknames (array). Uses accent-insensitive matching for Polish characters. Returns matches where ANY of the provided nicknames is found in either player name. The matched player is always returned as "player" (first position). Results are grouped by tournament (ordered by tournament_date DESC - most recent first), then within each tournament ordered by match_date DESC (latest matches first), and limited to the specified number (default 30).';

COMMENT ON TYPE nakka.player_match_result IS 
'Result type for player match queries. Contains tournament and match data with the searched player always in the "player" position. Includes match_date for chronological ordering.';

-- Step 9: Recreate get_player_match_by_id_and_nickname function with match_date and accent-insensitive search
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
      tm.match_date,
      
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
      tm.tournament_match_id = match_id
      AND (
        nakka.normalize_polish_text(tm.first_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
        OR nakka.normalize_polish_text(tm.second_player_name) LIKE '%' || nakka.normalize_polish_text(search_nickname) || '%'
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
    md.match_date,
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
'Retrieves a single match by tournament_match_id filtered by nickname. Uses accent-insensitive matching for Polish characters. The matched player is always returned as "player" (first position). Returns null if match not found or nickname does not match.';

-- Step 10: Recreate get_player_matches_by_tournament_and_nickname function with match_date and accent-insensitive search
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
      tm.match_date,
      
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
    ORDER BY t.tournament_date DESC, tm.match_date DESC, tm.tournament_match_id DESC
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
    md.match_date,
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
  ORDER BY md.tournament_date DESC, md.match_date DESC, md.tournament_match_id DESC;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION nakka.get_player_matches_by_tournament_and_nickname(TEXT, TEXT, INTEGER) IS 
'Retrieves matches for a player filtered by tournament keyword and nickname. Uses accent-insensitive matching for Polish characters. Returns matches where the nickname is found in either player name within tournaments matching the keyword. The matched player is always returned as "player" (first position). Results are grouped by tournament (ordered by tournament_date DESC - most recent first), then within each tournament ordered by match_date DESC (latest matches first), and limited to the specified number (default 30).';
