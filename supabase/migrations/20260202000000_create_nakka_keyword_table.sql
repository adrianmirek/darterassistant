-- Migration: Create nakka.keyword table
-- Purpose: Store keywords with their last synchronization dates
-- Schema: nakka
-- Tables Affected: nakka.keyword (new)
-- Date: 2026-02-02
--
-- This migration creates a new table to track keywords and when they were
-- last synchronized with external systems.

-- Create the keyword table
create table if not exists nakka.keyword (
  -- Primary identifier for the keyword
  id uuid primary key default gen_random_uuid(),
  
  -- The keyword text (case-insensitive, unique)
  keyword text not null unique,
  
  -- Timestamp of the last synchronization
  last_sync_date timestamptz not null default now(),
  
  -- Standard audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add comments for documentation
comment on table nakka.keyword is 'Stores keywords and their synchronization status';
comment on column nakka.keyword.id is 'Unique identifier for the keyword record';
comment on column nakka.keyword.keyword is 'The keyword text (unique, case-insensitive)';
comment on column nakka.keyword.last_sync_date is 'Timestamp of the last synchronization with external systems';
comment on column nakka.keyword.created_at is 'Timestamp when the keyword was first created';
comment on column nakka.keyword.updated_at is 'Timestamp when the keyword was last updated';

-- Create index on keyword for faster lookups
create index if not exists idx_nakka_keyword_keyword on nakka.keyword(keyword);

-- Create index on last_sync_date for filtering by sync status
create index if not exists idx_nakka_keyword_last_sync_date on nakka.keyword(last_sync_date);

-- Enable Row Level Security (required for all tables)
alter table nakka.keyword enable row level security;

-- RLS Policy: Allow anonymous users to select keywords
-- Rationale: Keywords may need to be publicly readable for search/display
create policy "allow_anon_select_keyword"
  on nakka.keyword
  for select
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to select keywords
-- Rationale: Authenticated users should have read access to keywords
create policy "allow_authenticated_select_keyword"
  on nakka.keyword
  for select
  to authenticated
  using (true);

-- RLS Policy: Allow anonymous users to insert keywords
-- Rationale: Allow external systems to add new keywords via API
create policy "allow_anon_insert_keyword"
  on nakka.keyword
  for insert
  to anon
  with check (true);

-- RLS Policy: Allow authenticated users to insert keywords
-- Rationale: Authenticated users can add new keywords
create policy "allow_authenticated_insert_keyword"
  on nakka.keyword
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Allow anonymous users to update keywords
-- Rationale: Allow external systems to update sync dates via API
create policy "allow_anon_update_keyword"
  on nakka.keyword
  for update
  to anon
  using (true)
  with check (true);

-- RLS Policy: Allow authenticated users to update keywords
-- Rationale: Authenticated users can update keyword information
create policy "allow_authenticated_update_keyword"
  on nakka.keyword
  for update
  to authenticated
  using (true)
  with check (true);

-- RLS Policy: Allow anonymous users to delete keywords
-- Rationale: Allow external systems to clean up keywords via API
create policy "allow_anon_delete_keyword"
  on nakka.keyword
  for delete
  to anon
  using (true);

-- RLS Policy: Allow authenticated users to delete keywords
-- Rationale: Authenticated users can remove keywords
create policy "allow_authenticated_delete_keyword"
  on nakka.keyword
  for delete
  to authenticated
  using (true);

-- Create function to automatically update the updated_at timestamp
create or replace function nakka.update_keyword_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to call the update function
create trigger update_keyword_updated_at
  before update on nakka.keyword
  for each row
  execute function nakka.update_keyword_updated_at();


-- Grant table permissions to roles
-- Service role gets full access (bypasses RLS anyway, but good practice)
grant all on nakka.keyword to service_role;
grant all on nakka.keyword to postgres;

-- Authenticated and anon users get access (controlled by RLS policies)
grant select, insert, update, delete on nakka.keyword to authenticated;
grant select, insert, update, delete on nakka.keyword to anon;

-- Grant execute permission on the function
grant execute on function nakka.update_keyword_updated_at() to service_role;
grant execute on function nakka.update_keyword_updated_at() to authenticated;
grant execute on function nakka.update_keyword_updated_at() to anon;
