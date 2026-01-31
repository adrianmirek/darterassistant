-- Check if this specific match has updated legs_won
SELECT 
    id,
    player1_legs_won,
    player2_legs_won,
    match_status,
    created_at,
    updated_at
FROM topdarter.matches 
WHERE id = '56c192c0-636f-4d26-84eb-42fe6661cd8f';
