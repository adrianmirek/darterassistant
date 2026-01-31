-- Check if legs_won was updated for the most recent winning throws
SELECT 
    ml.id as throw_id,
    ml.match_id,
    ml.winner_player_number,
    ml.winning_checkout,
    ml.created_at as throw_created_at,
    m.player1_legs_won,
    m.player2_legs_won,
    m.match_status,
    m.updated_at as match_updated_at
FROM topdarter.match_legs ml
INNER JOIN topdarter.matches m ON ml.match_id = m.id
WHERE ml.winner_player_number IS NOT NULL
ORDER BY ml.created_at DESC
LIMIT 3;
