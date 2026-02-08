-- Migration: Create nakka.no_keyword table
-- Purpose: Store keywords with nicknames and user associations
-- Schema: nakka
-- Tables Affected: nakka.no_keyword (new)
-- Date: 2026-02-08
--
-- This migration creates a new table to track keywords associated with
-- user nicknames and emails.

-- Create the no_keyword table
create table if not exists nakka.no_keyword (
  -- Primary identifier for the record
  id uuid primary key default gen_random_uuid(),
  
  -- The keyword text (case-insensitive)
  keyword text not null,
  
  -- The nickname associated with this keyword
  nickname text not null,
  
  -- User email for tracking/auditing
  user_email text not null,
  
  -- Standard audit timestamp
  created_at timestamptz not null default now()
);

-- Add comments for documentation
comment on table nakka.no_keyword is 'Stores keywords associated with user nicknames and emails';
comment on column nakka.no_keyword.id is 'Unique identifier for the no_keyword record';
comment on column nakka.no_keyword.keyword is 'The keyword text';
comment on column nakka.no_keyword.nickname is 'The nickname associated with this keyword';
comment on column nakka.no_keyword.user_email is 'Email address of the user who created this record';
comment on column nakka.no_keyword.created_at is 'Timestamp when the record was created';

-- Create index on keyword for faster lookups
create index if not exists idx_nakka_no_keyword_keyword on nakka.no_keyword(keyword);

-- Create index on nickname for filtering by nickname
create index if not exists idx_nakka_no_keyword_nickname on nakka.no_keyword(nickname);

-- Create index on user_email for filtering by user
create index if not exists idx_nakka_no_keyword_user_email on nakka.no_keyword(user_email);

-- Create composite index for common queries (keyword + nickname)
create index if not exists idx_nakka_no_keyword_keyword_nickname on nakka.no_keyword(keyword, nickname);

-- Enable Row Level Security (required for all tables)
alter table nakka.no_keyword enable row level security;

-- RLS Policy: Allow anonymous users to select no_keywords
-- Rationale: Keywords may need to be publicly readable for search/display
create policy "allow_anon_select_no_keyword"
  on nakka.no_keyword
  for select
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to select no_keywords
-- Rationale: Authenticated users should have read access to keywords
create policy "allow_authenticated_select_no_keyword"
  on nakka.no_keyword
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow anonymous users to insert no_keywords
-- Rationale: Allow external systems to add new keywords via API
create policy "allow_anon_insert_no_keyword"
  on nakka.no_keyword
  for insert
  to anon
  with check (true);

-- RLS Policy: Allow authenticated users to insert no_keywords
-- Rationale: Authenticated users can add new keywords
create policy "allow_authenticated_insert_no_keyword"
  on nakka.no_keyword
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Allow anonymous users to update no_keywords
-- Rationale: Allow external systems to update keywords via API
create policy "allow_anon_update_no_keyword"
  on nakka.no_keyword
  for update
  to anon
  using (true)
  with check (true);

-- RLS Policy: Allow authenticated users to update no_keywords
-- Rationale: Authenticated users can update keyword information
create policy "allow_authenticated_update_no_keyword"
  on nakka.no_keyword
  for update
  to authenticated
  using (true)
  with check (true);

-- RLS Policy: Allow anonymous users to delete no_keywords
-- Rationale: Allow external systems to clean up keywords via API
create policy "allow_anon_delete_no_keyword"
  on nakka.no_keyword
  for delete
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to delete no_keywords
-- Rationale: Authenticated users can remove keywords
create policy "allow_authenticated_delete_no_keyword"
  on nakka.no_keyword
  for delete
  to authenticated
  using (true);

-- Grant table permissions to roles
-- Service role gets full access (bypasses RLS anyway, but good practice)
grant all on nakka.no_keyword to service_role;
grant all on nakka.no_keyword to postgres;

-- Authenticated and anon users get access (controlled by RLS policies)
grant select, insert, update, delete on nakka.no_keyword to authenticated;
grant select, insert, update, delete on nakka.no_keyword to anon;
