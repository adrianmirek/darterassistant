-- Migration: Fix RLS policies for user_action_tracking table
-- Purpose: Allow INSERT for anon and authenticated users while keeping data private
-- Date: 2026-02-13
-- Tables Affected: public.user_action_tracking

-- Drop existing restrictive policies
drop policy if exists "deny_anon_all_user_action_tracking" on public.user_action_tracking;
drop policy if exists "deny_authenticated_select_user_action_tracking" on public.user_action_tracking;

-- Allow anonymous users to INSERT tracking data
create policy "allow_anon_insert_user_action_tracking"
  on public.user_action_tracking
  for insert
  to anon
  with check (true);

-- Allow authenticated users to INSERT tracking data
create policy "allow_authenticated_insert_user_action_tracking"
  on public.user_action_tracking
  for insert
  to authenticated
  with check (true);

-- Deny SELECT access to anon users (data is private)
create policy "deny_anon_select_user_action_tracking"
  on public.user_action_tracking
  for select
  to anon
  using (false);

-- Deny SELECT access to authenticated users (only admins can read)
create policy "deny_authenticated_select_user_action_tracking"
  on public.user_action_tracking
  for select
  to authenticated
  using (false);

-- Deny UPDATE to anon users (tracking records are immutable)
create policy "deny_anon_update_user_action_tracking"
  on public.user_action_tracking
  for update
  to anon
  using (false);

-- Deny DELETE to anon users
create policy "deny_anon_delete_user_action_tracking"
  on public.user_action_tracking
  for delete
  to anon
  using (false);

-- Deny UPDATE to authenticated users (tracking records are immutable)
create policy "deny_authenticated_update_user_action_tracking"
  on public.user_action_tracking
  for update
  to authenticated
  using (false);

-- Deny DELETE to authenticated users
create policy "deny_authenticated_delete_user_action_tracking"
  on public.user_action_tracking
  for delete
  to authenticated
  using (false);

-- Grant INSERT permission to anon and authenticated
grant insert on public.user_action_tracking to anon;
grant insert on public.user_action_tracking to authenticated;
