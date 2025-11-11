import { createSupabaseE2EClient } from './utils/supabase-client';

/**
 * Global teardown function that runs after all E2E tests complete
 * Cleans up test data from Supabase database for the E2E test user ONLY
 * 
 * IMPORTANT: Only deletes data where user_id matches E2E_USERNAME_ID
 * Other users' data is never affected by this cleanup process
 */
async function globalTeardown() {
  console.log('Starting E2E database cleanup...');

  try {
    const supabase = createSupabaseE2EClient();
    const userId = process.env.E2E_USERNAME_ID;

    if (!userId) {
      console.warn(
        'E2E_USERNAME_ID not set, skipping database cleanup. Test data may persist.',
      );
      return;
    }

    console.log(`Cleaning up data for E2E user: ${userId}`);

    // First, get all tournament IDs for the test user
    const { data: tournaments, error: fetchError } = await supabase
      .from('tournaments')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching tournaments:', fetchError.message);
      return;
    }

    if (!tournaments || tournaments.length === 0) {
      console.log('No tournaments found for cleanup');
      return;
    }

    const tournamentIds = tournaments.map((t) => t.id);

    // Delete tournament match results first (due to foreign key constraint)
    const { error: matchResultsError, count: matchResultsCount } = await supabase
      .from('tournament_match_results')
      .delete({ count: 'exact' })
      .in('tournament_id', tournamentIds);

    if (matchResultsError) {
      console.error(
        'Error deleting tournament match results:',
        matchResultsError.message,
      );
    } else {
      console.log(
        `✓ Tournament match results cleaned up (${matchResultsCount ?? 0} records deleted)`,
      );
    }

    // Delete tournaments for the test user
    const { error: tournamentsError, count: tournamentsCount } = await supabase
      .from('tournaments')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    if (tournamentsError) {
      console.error('Error deleting tournaments:', tournamentsError.message);
    } else {
      console.log(
        `✓ Tournaments cleaned up (${tournamentsCount ?? 0} records deleted)`,
      );
    }

    console.log('E2E database cleanup completed successfully');
    console.log('Note: Only data for E2E user was deleted. Other users\' data remains intact.');
  } catch (error) {
    console.error('Failed to cleanup E2E database:', error);
    // Don't throw - we don't want to fail the test run if cleanup fails
  }
}

export default globalTeardown;

