import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase credentials. URL: ${supabaseUrl ? 'set' : 'missing'}, Key: ${supabaseAnonKey ? 'set' : 'missing'}`
  );
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabaseClient;

export const DEFAULT_USER_ID = '0e0d1bda-8ef2-4550-963e-f5e5202a3166';
export const DEFAULT_USER_EMAIL = 'dev@example.com';