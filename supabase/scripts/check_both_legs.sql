-- Check all winning throws for the current match
SELECT 
    ml.id as throw_id,
    ml.leg_number,
    ml.player_number,
    ml.winner_player_number,
    ml.winning_checkout,
    ml.created_at as throw_created_at,
    m.player1_legs_won,
    m.player2_legs_won,
    m.match_status
FROM topdarter.match_legs ml
INNER JOIN topdarter.matches m ON ml.match_id = m.id
WHERE ml.match_id = '56c192c0-636f-4d26-84eb-42fe6661cd8f'
  AND ml.winner_player_number IS NOT NULL
ORDER BY ml.leg_number, ml.created_at;
