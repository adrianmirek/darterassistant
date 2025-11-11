import { createSupabaseE2EClient } from "./utils/supabase-client";

/**
 * Global teardown function that runs after all E2E tests complete
 * Cleans up test data from Supabase database for the E2E test user ONLY
 *
 * IMPORTANT: Only deletes data where user_id matches E2E_USERNAME_ID
 * Other users' data is never affected by this cleanup process
 */
async function globalTeardown() {
  // Starting E2E database cleanup...

  try {
    const supabase = createSupabaseE2EClient();
    const userId = process.env.E2E_USERNAME_ID;

    if (!userId) {
      // E2E_USERNAME_ID not set, skipping database cleanup. Test data may persist.
      return;
    }

    // Cleaning up data for E2E user

    // First, get all tournament IDs for the test user
    const { data: tournaments, error: fetchError } = await supabase
      .from("tournaments")
      .select("id")
      .eq("user_id", userId);

    if (fetchError) {
      // Error fetching tournaments
      return;
    }

    if (!tournaments || tournaments.length === 0) {
      // No tournaments found for cleanup
      return;
    }

    const tournamentIds = tournaments.map((t) => t.id);

    // Delete tournament match results first (due to foreign key constraint)
    const { error: matchResultsError } = await supabase
      .from("tournament_match_results")
      .delete({ count: "exact" })
      .in("tournament_id", tournamentIds);

    if (matchResultsError) {
      // Error deleting tournament match results
    }

    // Delete tournaments for the test user
    const { error: tournamentsError } = await supabase
      .from("tournaments")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    if (tournamentsError) {
      // Error deleting tournaments
    }

    // E2E database cleanup completed successfully
    // Note: Only data for E2E user was deleted. Other users' data remains intact.
  } catch {
    // Failed to cleanup E2E database
    // Don't throw - we don't want to fail the test run if cleanup fails
  }
}

export default globalTeardown;
