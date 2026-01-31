-- Query to check the actual trigger function code in the database
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'update_match_on_leg_complete';
