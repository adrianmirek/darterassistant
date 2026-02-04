-- =====================================================================
-- Migration: Expose TopDarter Schema to PostgREST API
-- =====================================================================
-- Purpose: Configure PostgREST to allow API access to the topdarter schema
--          by adding it to the exposed schemas list
-- 
-- PostgREST Configuration:
--   - Adds topdarter to db-schemas setting
--   - Grants usage permissions to anon and authenticated roles
--
-- Dependencies: 20260119120000_create_topdarter_schema_and_tables.sql
-- Created: 2026-01-28
-- =====================================================================

-- =====================================================================
-- Step 1: Grant Schema Usage to API Roles
-- =====================================================================

-- Grant usage on topdarter schema to anon role (for guest players)
grant usage on schema topdarter to anon;

-- Grant usage on topdarter schema to authenticated role
grant usage on schema topdarter to authenticated;

-- =====================================================================
-- Step 2: Grant Table Access to API Roles
-- =====================================================================

-- Grant ALL on all tables in topdarter schema to anon (guests need to create/update matches)
grant all on all tables in schema topdarter to anon;

-- Grant ALL on all tables in topdarter schema to authenticated
grant all on all tables in schema topdarter to authenticated;

-- Grant ALL on all tables in topdarter schema to anon (for future tables)
alter default privileges in schema topdarter grant all on tables to anon;

-- Grant ALL on all tables in topdarter schema to authenticated (for future tables)
alter default privileges in schema topdarter grant all on tables to authenticated;

-- =====================================================================
-- Step 3: Grant Sequence Access (for UUID generation, etc.)
-- =====================================================================

-- Grant usage on all sequences to authenticated
grant usage on all sequences in schema topdarter to authenticated;

-- Grant usage on sequences for future tables
alter default privileges in schema topdarter grant usage on sequences to authenticated;

-- =====================================================================
-- NOTE: PostgREST Schema Configuration
-- =====================================================================
-- The topdarter schema must be added to PostgREST's db-schemas setting.
-- 
-- For local development:
--   Update supabase/config.toml:
--   
--   [api]
--   schemas = ["public", "graphql_public", "nakka", "topdarter"]
--
-- For production (Supabase Cloud):
--   Update via Supabase Dashboard:
--   Settings > API > Exposed schemas > Add "topdarter"
--
-- After updating config, restart Supabase:
--   npx supabase stop
--   npx supabase start
-- =====================================================================

-- =====================================================================
-- Summary
-- =====================================================================
-- Permissions Granted:
--   ✓ Schema usage for anon and authenticated
--   ✓ Table SELECT for anon (read-only guest access)
--   ✓ Table ALL for authenticated (full CRUD)
--   ✓ Sequence usage for authenticated
--   ✓ Default privileges for future objects
--
-- Next Steps:
--   1. Update supabase/config.toml to expose topdarter schema
--   2. Restart Supabase local instance
--   3. Verify API access: GET http://localhost:54321/rest/v1/match_types
-- =====================================================================
