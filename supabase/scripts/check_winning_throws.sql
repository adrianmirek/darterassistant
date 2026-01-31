-- Check the winning throws data
SELECT 
    id,
    match_id,
    leg_number,
    player_number,
    throw_number,
    round_number,
    score,
    remaining_score,
    is_checkout_attempt,
    winner_player_number,
    winning_checkout,
    created_at
FROM topdarter.match_legs 
WHERE id IN (
    '7e25d3ae-4d73-4aaa-832c-04775a8db8c5',
    '5fa3cb1c-2d63-4a15-b48d-d1c0f50a5cf8'
);
