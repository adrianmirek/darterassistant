// @ts-nocheck

import { defineMiddleware } from 'astro:middleware';

import { DEFAULT_USER_EMAIL, DEFAULT_USER_ID, supabaseClient } from '../db/supabase.client';

export const onRequest = defineMiddleware(async (context, next) => {
  // Set Supabase client in context
  context.locals.supabase = supabaseClient;

  // TODO: Replace with real authentication
  // Mock user for development (authentication will be implemented separately)
  context.locals.user = {
    id: DEFAULT_USER_ID, // Mock UUID
    email: DEFAULT_USER_EMAIL,
  };

  return next();
});

