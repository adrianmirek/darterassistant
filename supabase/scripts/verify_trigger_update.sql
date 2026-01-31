-- Check if the trigger function has the fix
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'update_match_on_leg_complete';
