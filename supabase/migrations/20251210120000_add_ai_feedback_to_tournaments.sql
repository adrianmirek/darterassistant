-- =====================================================================
-- Migration: Add AI Feedback Column to Tournaments
-- Purpose: Store OpenRouter AI-generated feedback for tournament performance
-- Affected Objects:
--   - Tables: tournaments (add ai_feedback column)
-- Special Considerations:
--   - Column is nullable to support scenarios where AI service is unavailable
--   - Existing tournaments will have NULL ai_feedback
-- =====================================================================

-- Add ai_feedback column to tournaments table
-- This column will store AI-generated performance feedback from OpenRouter
alter table tournaments
  add column ai_feedback text;

-- Add comment to document the column purpose
comment on column tournaments.ai_feedback is 'AI-generated performance feedback from OpenRouter service. NULL if AI service was unavailable or failed during tournament creation.';

