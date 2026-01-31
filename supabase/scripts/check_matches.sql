-- Check if legs_won was updated in matches table
WITH winning_matches AS (
    SELECT DISTINCT match_id 
    FROM topdarter.match_legs 
    WHERE id IN (
        '7e25d3ae-4d73-4aaa-832c-04775a8db8c5',
        '5fa3cb1c-2d63-4a15-b48d-d1c0f50a5cf8'
    )
)
SELECT 
    m.id,
    m.player1_legs_won,
    m.player2_legs_won,
    m.match_status,
    m.winner_player_number,
    m.created_at
FROM topdarter.matches m
INNER JOIN winning_matches wm ON m.id = wm.match_id;
