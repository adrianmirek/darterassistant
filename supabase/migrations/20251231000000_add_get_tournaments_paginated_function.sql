-- =====================================================================
-- Migration: Create Paginated Tournaments List Function
-- Purpose: Retrieve tournaments with aggregated stats and match details
-- Function: get_tournaments_paginated
-- Parameters:
--   - p_user_id: UUID of the user
--   - p_start_date: Start of date range filter
--   - p_end_date: End of date range filter
--   - p_page_size: Number of records per page (default: 20)
--   - p_page_number: Page number for pagination (default: 1)
-- Returns: Tournament records with nested match details as JSON array
-- Special Considerations:
--   - Sorted by tournament date DESC (most recent first)
--   - Uses offset/limit pagination
--   - Includes total count for pagination metadata
-- =====================================================================

CREATE OR REPLACE FUNCTION get_tournaments_paginated(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_page_size INTEGER DEFAULT 20,
  p_page_number INTEGER DEFAULT 1
)
RETURNS TABLE (
  -- Tournament basic information
  tournament_id UUID,
  tournament_name TEXT,
  tournament_date DATE,
  final_place INTEGER,
  tournament_type_name TEXT,
  ai_feedback TEXT,
  
  -- Tournament-level aggregated statistics
  tournament_avg NUMERIC,
  total_180s BIGINT,
  total_140_plus BIGINT,
  total_100_plus BIGINT,
  total_60_plus BIGINT,
  avg_checkout_percentage NUMERIC,
  best_high_finish INTEGER,
  best_leg INTEGER,
  
  -- Match details as JSON array
  matches JSONB,
  
  -- Pagination metadata
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH tournament_aggregates AS (
    -- Aggregate tournament-level statistics from all matches
    SELECT
      t.id,
      t.name,
      t.date,
      t.final_place,
      t.ai_feedback,
      tt.name as tournament_type_name,
      -- Calculate average of all match averages
      AVG(tmr.average_score) as tournament_avg,
      -- Sum all score counts across matches
      SUM(tmr.score_180_count) as total_180s,
      SUM(tmr.score_140_count) as total_140_plus,
      SUM(tmr.score_100_count) as total_100_plus,
      SUM(tmr.score_60_count) as total_60_plus,
      -- Average checkout percentage across all matches
      AVG(tmr.checkout_percentage) as avg_checkout_percentage,
      -- Find the best high finish across all matches
      MAX(tmr.high_finish) as best_high_finish,
      -- Find the best (minimum) leg, excluding zeros
      MIN(tmr.best_leg) FILTER (WHERE tmr.best_leg > 0) as best_leg
    FROM tournaments t
    LEFT JOIN tournament_types tt ON t.tournament_type_id = tt.id
    LEFT JOIN tournament_match_results tmr ON t.id = tmr.tournament_id
    WHERE t.user_id = p_user_id
      AND t.date BETWEEN p_start_date AND p_end_date
    GROUP BY t.id, t.name, t.date, t.final_place, t.ai_feedback, tt.name
  ),
  match_details AS (
    -- Aggregate all match details into JSON array per tournament
    SELECT
      tmr.tournament_id,
      jsonb_agg(
        jsonb_build_object(
          'match_id', tmr.id,
          'opponent', tmr.opponent_name,
          'result', tmr.player_score || '-' || tmr.opponent_score,
          'player_score', tmr.player_score,
          'opponent_score', tmr.opponent_score,
          'match_type', mt.name,
          'average_score', ROUND(tmr.average_score, 2),
          'first_nine_avg', ROUND(tmr.first_nine_avg, 2),
          'checkout_percentage', ROUND(tmr.checkout_percentage, 2),
          'high_finish', tmr.high_finish,
          'score_180s', tmr.score_180_count,
          'score_140_plus', tmr.score_140_count,
          'score_100_plus', tmr.score_100_count,
          'score_60_plus', tmr.score_60_count,
          'best_leg', tmr.best_leg,
          'worst_leg', tmr.worst_leg,
          'created_at', tmr.created_at
        )
        ORDER BY tmr.created_at
      ) as matches
    FROM tournament_match_results tmr
    JOIN match_types mt ON tmr.match_type_id = mt.id
    WHERE tmr.tournament_id IN (
      SELECT id FROM tournament_aggregates
    )
    GROUP BY tmr.tournament_id
  ),
  total_tournaments AS (
    -- Count total tournaments matching the filter criteria
    SELECT COUNT(*) as total_count
    FROM tournaments
    WHERE user_id = p_user_id
      AND date BETWEEN p_start_date AND p_end_date
  )
  -- Final result set with pagination
  SELECT
    ta.id,
    ta.name,
    ta.date,
    ta.final_place,
    ta.tournament_type_name,
    ta.ai_feedback,
    ROUND(ta.tournament_avg, 2),
    COALESCE(ta.total_180s, 0),
    COALESCE(ta.total_140_plus, 0),
    COALESCE(ta.total_100_plus, 0),
    COALESCE(ta.total_60_plus, 0),
    ROUND(ta.avg_checkout_percentage, 2),
    COALESCE(ta.best_high_finish, 0),
    COALESCE(ta.best_leg, 0),
    COALESCE(md.matches, '[]'::jsonb),
    tt.total_count
  FROM tournament_aggregates ta
  LEFT JOIN match_details md ON ta.id = md.tournament_id
  CROSS JOIN total_tournaments tt
  ORDER BY ta.date DESC
  LIMIT p_page_size
  OFFSET (p_page_number - 1) * p_page_size;
END;
$$;

-- Add comment for function documentation
COMMENT ON FUNCTION get_tournaments_paginated IS 'Retrieves paginated list of tournaments for a specific user within a date range. Returns tournaments with aggregated statistics and nested match details as JSON array. Default page size is 20, sorted by date DESC.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_tournaments_paginated TO authenticated;

