-- Migration: Create user_action_tracking table
-- Purpose: Track user actions (Search Matches, Start Match) with device identification
-- Schema: public
-- Date: 2026-02-13
-- Tables Affected: public.user_action_tracking (new)

-- Create the user action tracking table
create table if not exists public.user_action_tracking (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- Action information
  action_name text not null,
  description text,
  
  -- User and device identification
  user_id uuid references auth.users(id) on delete set null,
  device_identifier text not null,
  
  -- Timestamp
  created_at timestamptz not null default now()
);

-- Add comments for documentation
comment on table public.user_action_tracking is 'Tracks user actions with device identification for analytics';
comment on column public.user_action_tracking.id is 'Unique identifier for the tracking record';
comment on column public.user_action_tracking.action_name is 'Name of the action performed (e.g., Search Matches, Start Match)';
comment on column public.user_action_tracking.description is 'Additional context for the action (e.g., search keyword for Search Matches)';
comment on column public.user_action_tracking.user_id is 'User ID if authenticated, null for guests';
comment on column public.user_action_tracking.device_identifier is 'Unique device identifier that persists across browser and app';
comment on column public.user_action_tracking.created_at is 'Timestamp when the action was tracked';

-- Create indexes for performance
create index idx_user_action_tracking_action_name on public.user_action_tracking(action_name);
create index idx_user_action_tracking_user_id on public.user_action_tracking(user_id) where user_id is not null;
create index idx_user_action_tracking_device_id on public.user_action_tracking(device_identifier);
create index idx_user_action_tracking_created_at on public.user_action_tracking(created_at desc);

-- Composite index for admin analytics queries
create index idx_user_action_tracking_action_date on public.user_action_tracking(action_name, created_at desc);

-- Enable Row Level Security
alter table public.user_action_tracking enable row level security;

-- RLS Policy: Allow anonymous users to insert tracking data
-- Rationale: Guests need to track their actions, but cannot read any data
create policy "allow_anon_insert_user_action_tracking"
  on public.user_action_tracking
  for insert
  to anon
  with check (true);

-- RLS Policy: Allow authenticated users to insert tracking data
-- Rationale: Authenticated users need to track their actions, but cannot read any data
create policy "allow_authenticated_insert_user_action_tracking"
  on public.user_action_tracking
  for insert
  to authenticated
  with check (true);

-- RLS Policy: Deny all SELECT access to anon users
-- Rationale: Tracking data should not be readable by anonymous users
create policy "deny_anon_select_user_action_tracking"
  on public.user_action_tracking
  for select
  to anon
  using (false);

-- RLS Policy: Deny all SELECT access to authenticated users
-- Rationale: Only admins should see tracking data
create policy "deny_authenticated_select_user_action_tracking"
  on public.user_action_tracking
  for select
  to authenticated
  using (false);

-- RLS Policy: Deny UPDATE and DELETE to anon users
-- Rationale: Tracking records should be immutable
create policy "deny_anon_update_delete_user_action_tracking"
  on public.user_action_tracking
  for update
  to anon
  using (false);

create policy "deny_anon_delete_user_action_tracking"
  on public.user_action_tracking
  for delete
  to anon
  using (false);

-- RLS Policy: Deny UPDATE and DELETE to authenticated users
-- Rationale: Tracking records should be immutable
create policy "deny_authenticated_update_delete_user_action_tracking"
  on public.user_action_tracking
  for update
  to authenticated
  using (false);

create policy "deny_authenticated_delete_user_action_tracking"
  on public.user_action_tracking
  for delete
  to authenticated
  using (false);

-- Grant table permissions
grant all on public.user_action_tracking to service_role;
grant all on public.user_action_tracking to postgres;

-- Grant INSERT only to anon and authenticated (RLS will control access)
grant insert on public.user_action_tracking to anon;
grant insert on public.user_action_tracking to authenticated;
