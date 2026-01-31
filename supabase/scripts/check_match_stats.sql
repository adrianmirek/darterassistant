-- Get the match_ids from the winning throws first
WITH winning_matches AS (
    SELECT DISTINCT match_id 
    FROM topdarter.match_legs 
    WHERE id IN (
        '7e25d3ae-4d73-4aaa-832c-04775a8db8c5',
        '5fa3cb1c-2d63-4a15-b48d-d1c0f50a5cf8'
    )
)
-- Check the stats for these matches
SELECT 
    ms.match_id,
    ms.player_number,
    ms.checkout_attempts,
    ms.successful_checkouts,
    ms.high_finish,
    ms.finishes_100_plus,
    ms.created_at
FROM topdarter.match_stats ms
INNER JOIN winning_matches wm ON ms.match_id = wm.match_id;
