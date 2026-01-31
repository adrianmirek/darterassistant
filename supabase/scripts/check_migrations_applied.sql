-- Check which migrations have been applied
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
WHERE version >= '20260131000000'
ORDER BY version DESC;
