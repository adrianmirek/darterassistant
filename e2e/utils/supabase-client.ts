import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/db/database.types';

/**
 * Creates a Supabase client for E2E testing purposes
 * This client is used in test setup/teardown and doesn't rely on Astro context
 */
export function createSupabaseE2EClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublicKey = process.env.SUPABASE_PUBLIC_KEY;

  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_PUBLIC_KEY must be set in environment variables',
    );
  }

  return createClient<Database>(supabaseUrl, supabasePublicKey);
}

