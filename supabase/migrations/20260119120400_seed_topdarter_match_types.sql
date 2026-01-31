-- =====================================================================
-- Migration: Seed TopDarter Match Types
-- =====================================================================
-- Purpose: Insert default match types (game modes) into the database
--          to make the system immediately usable
-- 
-- Match Types Seeded:
--   1. 501 (Standard professional darts)
--   2. 301 (Quick game variant)
--   3. 701 (Long format)
--   4. 1001 (Tournament format)
--   5. Cricket (Alternative scoring game)
--
-- Note: These are default configurations. Users can customize
--       individual match settings when creating a match.
--
-- Dependencies: 20260119120000_create_topdarter_schema_and_tables.sql
-- Schema Version: 1.0.0
-- Created: 2026-01-19
-- =====================================================================

-- =====================================================================
-- Seed Match Types
-- =====================================================================

-- ---------------------------------------------------------------------
-- 501: Most common darts game
-- ---------------------------------------------------------------------
-- Standard professional format
-- First to reduce score from 501 to exactly 0
-- Must finish on a double (double out rule)
-- Default: First to 3 legs
-- Note: Using fixed UUID for easy reference in frontend
-- ---------------------------------------------------------------------

insert into topdarter.match_types (
  id,
  name,
  default_start_score,
  default_checkout_rule,
  default_format_type,
  default_legs_count,
  default_sets_count,
  description,
  is_active
) values (
  '550e8400-e29b-41d4-a716-446655440501'::uuid, -- Fixed UUID for "501"
  '501',
  501,
  'double_out',
  'first_to',
  3,
  null,
  'Standard professional darts game. Start at 501, reduce to exactly 0, must finish on a double.',
  true
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 301: Quick game variant
-- ---------------------------------------------------------------------
-- Faster-paced game for casual play
-- First to reduce score from 301 to exactly 0
-- Must finish on a double (double out rule)
-- Default: First to 3 legs
-- ---------------------------------------------------------------------

insert into topdarter.match_types (
  name,
  default_start_score,
  default_checkout_rule,
  default_format_type,
  default_legs_count,
  default_sets_count,
  description,
  is_active
) values (
  '301',
  301,
  'double_out',
  'first_to',
  3,
  null,
  'Quick game variant. Start at 301, reduce to exactly 0, must finish on a double.',
  true
);

-- ---------------------------------------------------------------------
-- 701: Long format
-- ---------------------------------------------------------------------
-- Extended game for serious matches
-- First to reduce score from 701 to exactly 0
-- Must finish on a double (double out rule)
-- Default: First to 3 legs
-- ---------------------------------------------------------------------

insert into topdarter.match_types (
  name,
  default_start_score,
  default_checkout_rule,
  default_format_type,
  default_legs_count,
  default_sets_count,
  description,
  is_active
) values (
  '701',
  701,
  'double_out',
  'first_to',
  3,
  null,
  'Long format game. Start at 701, reduce to exactly 0, must finish on a double.',
  true
);

-- ---------------------------------------------------------------------
-- 1001: Tournament format
-- ---------------------------------------------------------------------
-- Extended tournament-style game
-- First to reduce score from 1001 to exactly 0
-- Must finish on a double (double out rule)
-- Default: First to 3 legs
-- ---------------------------------------------------------------------

insert into topdarter.match_types (
  name,
  default_start_score,
  default_checkout_rule,
  default_format_type,
  default_legs_count,
  default_sets_count,
  description,
  is_active
) values (
  '1001',
  1001,
  'double_out',
  'first_to',
  3,
  null,
  'Tournament format. Start at 1001, reduce to exactly 0, must finish on a double.',
  true
);

-- ---------------------------------------------------------------------
-- Practice 501: Unlimited practice mode
-- ---------------------------------------------------------------------
-- Practice mode with no winner
-- Unlimited legs for continuous play
-- Must finish on a double (double out rule)
-- No legs/sets limit (unlimited format)
-- ---------------------------------------------------------------------

insert into topdarter.match_types (
  name,
  default_start_score,
  default_checkout_rule,
  default_format_type,
  default_legs_count,
  default_sets_count,
  description,
  is_active
) values (
  'Practice 501',
  501,
  'double_out',
  'unlimited',
  null,
  null,
  'Practice mode for continuous play. No winner, unlimited legs.',
  true
);

-- ---------------------------------------------------------------------
-- 501 Straight Out: No double required
-- ---------------------------------------------------------------------
-- Beginner-friendly variant
-- First to reduce score from 501 to exactly 0
-- Can finish on any number (straight out)
-- Default: First to 3 legs
-- ---------------------------------------------------------------------

insert into topdarter.match_types (
  name,
  default_start_score,
  default_checkout_rule,
  default_format_type,
  default_legs_count,
  default_sets_count,
  description,
  is_active
) values (
  '501 Straight Out',
  501,
  'straight',
  'first_to',
  3,
  null,
  'Beginner-friendly 501. Start at 501, reduce to exactly 0, can finish on any number.',
  true
);

-- =====================================================================
-- Future Match Types (Placeholder - Currently Inactive)
-- =====================================================================
-- These are placeholders for future implementation.
-- They are marked as inactive and will not appear in the UI.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Cricket: Alternative scoring game
-- ---------------------------------------------------------------------
-- Different game mechanics (requires different scoring logic)
-- Players "close out" numbers 15-20 and bullseye
-- Currently inactive - implementation pending
-- ---------------------------------------------------------------------

insert into topdarter.match_types (
  name,
  default_start_score,
  default_checkout_rule,
  default_format_type,
  default_legs_count,
  default_sets_count,
  description,
  is_active
) values (
  'Cricket',
  0, -- Cricket doesn't use countdown scoring
  'straight', -- Cricket doesn't use checkout rules
  'first_to',
  3,
  null,
  'Alternative scoring game. Close out numbers 15-20 and bullseye. (Coming soon)',
  false -- INACTIVE: Different game mechanics require custom implementation
);

-- =====================================================================
-- Seed Summary
-- =====================================================================
-- Total Match Types Seeded: 7
--   - Active: 6 (available immediately)
--   - Inactive: 1 (Cricket - future implementation)
--
-- Default Match Types:
--   ✓ 501 (Standard)
--   ✓ 301 (Quick)
--   ✓ 701 (Long)
--   ✓ 1001 (Tournament)
--   ✓ Practice 501 (Unlimited)
--   ✓ 501 Straight Out (Beginner)
--   ○ Cricket (Coming soon)
--
-- Next Steps:
--   - Users can now create matches using these match types
--   - Application should load match types on startup
--   - Admin panel can manage match types via service role
-- =====================================================================

