# E2E Database Teardown Setup

This document describes the automated database cleanup implemented for E2E tests.

## Overview

After all E2E tests complete, a global teardown script automatically cleans up test data from the Supabase database **for the E2E test user only**. This prevents test data accumulation and ensures a clean state for the next test run.

**Important:** The cleanup is **user-scoped** and only deletes data where `user_id` matches `E2E_USERNAME_ID`. Other users' data is never touched.

## What Was Implemented

### 1. Supabase E2E Client (`e2e/utils/supabase-client.ts`)

A standalone Supabase client for E2E testing that doesn't depend on Astro context:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/db/database.types';

export function createSupabaseE2EClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublicKey = process.env.SUPABASE_PUBLIC_KEY;
  
  return createClient<Database>(supabaseUrl, supabasePublicKey);
}
```

### 2. Global Teardown Script (`e2e/global-teardown.ts`)

Automatically runs after all E2E tests complete:

- Fetches all tournaments for the test user (by `E2E_USERNAME_ID`)
- Deletes `tournament_match_results` first (respects foreign key constraints)
- Deletes `tournaments` for the test user
- Provides detailed logging of cleanup operations
- Non-blocking: won't fail test runs if cleanup fails

### 3. Playwright Configuration Update

Added global teardown to `playwright.config.ts`:

```typescript
export default defineConfig({
  // ... other config
  globalTeardown: './e2e/global-teardown.ts',
  // ...
});
```

## Environment Variables Setup

Create a `.env.test` file in the project root with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLIC_KEY=your-supabase-public-anon-key

# E2E Test User Credentials
E2E_USERNAME_ID=user-uuid-from-auth-users-table
E2E_USERNAME=test@example.com
E2E_PASSWORD=test_password

# Base URL (optional)
BASE_URL=http://localhost:3000
```

📖 **For detailed setup instructions, see [`ENV_SETUP_E2E.md`](ENV_SETUP_E2E.md)**

### How to Get E2E_USERNAME_ID

1. Create a dedicated test user in Supabase Auth (via dashboard or SQL)
2. Go to Supabase Dashboard → Authentication → Users
3. Find your test user and copy their UUID
4. Use that UUID as `E2E_USERNAME_ID`

Alternatively, query directly:

```sql
SELECT id FROM auth.users WHERE email = 'test@example.com';
```

## How It Works

### Test Execution Flow

1. **Tests Run** - All E2E tests execute normally
2. **Tests Complete** - Playwright finishes all test files
3. **Teardown Triggers** - `e2e/global-teardown.ts` runs automatically
4. **Data Cleanup** - Script deletes test data for the specified user
5. **Done** - Database is clean for next test run

### Database Operations

The teardown performs these operations in order:

```typescript
// 1. Fetch tournaments for test user
const tournaments = await supabase
  .from('tournaments')
  .select('id')
  .eq('user_id', userId);

// 2. Delete match results (child records first)
await supabase
  .from('tournament_match_results')
  .delete()
  .in('tournament_id', tournamentIds);

// 3. Delete tournaments (parent records)
await supabase
  .from('tournaments')
  .delete()
  .eq('user_id', userId);
```

## Running E2E Tests

```bash
# Run all e2e tests (cleanup runs automatically after)
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

## Console Output

When the teardown runs, you'll see output like:

```
Starting E2E database cleanup...
✓ Tournament match results cleaned up (5 records deleted)
✓ Tournaments cleaned up (2 records deleted)
E2E database cleanup completed successfully
```

## Extending the Cleanup

To add more tables to the cleanup process:

1. Open `e2e/global-teardown.ts`
2. Add new delete operations following the pattern
3. Respect foreign key constraints (delete child tables first)

Example:

```typescript
// Delete goals for the test user
const { error: goalsError } = await supabase
  .from('goals')
  .delete()
  .eq('user_id', userId);
```

## Troubleshooting

### Cleanup Not Running

- Verify `.env.test` exists with correct variables
- Check that `E2E_USERNAME_ID` matches your test user's UUID
- Ensure `playwright.config.ts` has `globalTeardown` configured

### Cleanup Errors

- Check console output for error messages
- Verify test user exists in Supabase Auth and `E2E_USERNAME_ID` is correct
- Ensure `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY` are correct
- Check foreign key constraints if delete fails
- Verify the E2E user has data to clean up

### Manual Cleanup

If you need to manually clean up test data:

```sql
-- In Supabase SQL Editor
DELETE FROM tournament_match_results 
WHERE tournament_id IN (
  SELECT id FROM tournaments WHERE user_id = 'your-test-user-uuid'
);

DELETE FROM tournaments WHERE user_id = 'your-test-user-uuid';
```

## Security Notes

- `.env.test` is git-ignored (never commit credentials)
- Use a dedicated test user (not your real account)
- Test user should have minimal permissions
- Consider using a separate Supabase project for testing

## Documentation Updates

- Updated `TESTING.md` with E2E environment setup section
- Added database cleanup documentation
- Updated project structure diagram

## Files Created/Modified

### Created:
- `e2e/utils/supabase-client.ts` - E2E Supabase client
- `e2e/global-teardown.ts` - Global teardown script
- `E2E_TEARDOWN_SETUP.md` - This document (implementation overview)
- `ENV_SETUP_E2E.md` - Detailed environment setup guide

### Modified:
- `playwright.config.ts` - Added globalTeardown configuration
- `TESTING.md` - Added E2E environment setup and database cleanup sections

## Next Steps

1. Create `.env.test` file with these required variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_PUBLIC_KEY` - Your Supabase public/anon key
   - `E2E_USERNAME_ID` - UUID of your E2E test user from `auth.users` table
   - `E2E_USERNAME` - E2E test user email
   - `E2E_PASSWORD` - E2E test user password
2. Create a dedicated test user in Supabase Auth
3. Copy the test user's UUID to `E2E_USERNAME_ID`
4. Run `npm run test:e2e` to verify setup
5. Check console for successful cleanup messages

**Remember:** Only data belonging to the E2E test user (matching `E2E_USERNAME_ID`) will be deleted. All other users' data remains untouched.

## Support

If you encounter issues:
1. Check environment variables are set correctly
2. Verify test user exists and ID is correct
3. Review console output for specific errors
4. Check Supabase dashboard for connection issues

