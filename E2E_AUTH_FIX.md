# E2E Authentication Fix

## Problem
The test file `add-tournament-multiple-matches.spec.ts` was timing out on the login page when running all tests together, even though individual tests passed.

### Root Cause
- Each test was performing a fresh login in `beforeEach`
- Multiple rapid logins caused:
  - Rate limiting from Supabase
  - Session conflicts between tests
  - Redirect timing issues

## Solution: Authentication Storage State

Implemented **Playwright's recommended authentication pattern** using storage state to authenticate once and reuse the session across all tests.

## Changes Made

### 1. Created Authentication Setup File
**File:** `e2e/utils/auth.setup.ts`

- Runs once before all tests (not per test)
- Performs single login
- Saves authentication cookies/session to `playwright/.auth/user.json`
- All tests reuse this authenticated state

### 2. Updated Playwright Config
**File:** `playwright.config.ts`

Added three projects:
- `setup` project that runs `*.setup.ts` files
- `chromium-unauthenticated` project:
  - For auth tests (login, register, etc.)
  - No storage state - tests start logged out
  - Matches: `e2e/auth/*.spec.ts`
- `chromium-authenticated` project:
  - For protected routes (tournaments, etc.)
  - Uses saved storage state from setup
  - Depends on setup project completing first
  - Matches: `e2e/tournaments/*.spec.ts`, `e2e/home/*.spec.ts`

### 3. Simplified Test File
**File:** `e2e/tournaments/add-tournament-multiple-matches.spec.ts`

Removed:
- Login logic from `beforeEach`
- `LoginPage` import (no longer needed)

Now `beforeEach` simply:
- Creates `AddTournamentPage` instance
- Navigates to tournament page (already authenticated)

### 4. Added .gitignore for Auth State
**File:** `playwright/.auth/.gitignore`

- Prevents committing authentication tokens/cookies

## Environment Variables

The auth setup supports both variable name patterns:
- **Primary:** `E2E_USERNAME`, `E2E_PASSWORD`
- **Fallback:** `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`

Ensure your `.env.test` file contains:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLIC_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# E2E Test User Credentials
E2E_USERNAME_ID=your-test-user-uuid-from-auth-users-table
E2E_USERNAME=test@example.com
E2E_PASSWORD=your_test_password

# Base URL
BASE_URL=http://localhost:3000
```

## How to Run Tests

### Run All Tests
```bash
npx playwright test
```

This will:
1. Run the `setup` project (authenticate once)
2. Run unauthenticated tests (login, register) without auth state
3. Run authenticated tests (tournaments) with saved auth state

### Run Authenticated Tests Only
```bash
npx playwright test --project=chromium-authenticated
```

Or specific file:
```bash
npx playwright test "e2e/tournaments/add-tournament-multiple-matches.spec.ts"
```

### Run Unauthenticated Tests Only (Login, etc.)
```bash
npx playwright test --project=chromium-unauthenticated
```

Or specific file:
```bash
npx playwright test "e2e/auth/login.spec.ts"
```

### Run Single Test
```bash
npx playwright test "e2e/tournaments/add-tournament-multiple-matches.spec.ts" -g "Scenario 2"
```

### Run with UI Mode
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test "e2e/tournaments/add-tournament-multiple-matches.spec.ts" --debug
```

## Benefits

✅ **Faster test execution** - Login happens once, not per test
✅ **More reliable** - No rate limiting or session conflicts
✅ **Better test isolation** - Each test starts from same authenticated state
✅ **Follows Playwright best practices** - Recommended pattern from official docs

## Troubleshooting

### If Tests Still Fail at Login

1. **Verify .env.test exists** with correct credentials:
   ```bash
   cat .env.test
   ```

2. **Check test user exists** in Supabase:
   - Go to Supabase Dashboard → Authentication → Users
   - Verify test user email matches `E2E_USERNAME`

3. **Clear existing auth state**:
   ```bash
   rm -rf playwright/.auth/user.json
   ```

4. **Run setup explicitly**:
   ```bash
   npx playwright test --project=setup
   ```

5. **Check for rate limiting**:
   - Wait a few minutes between test runs
   - Supabase free tier has rate limits on auth endpoints

### If Auth State is Invalid

Delete the stored state to force re-authentication:
```bash
rm playwright/.auth/user.json
```

Then run tests again.

## Project Structure

### Authenticated Tests
Place in these directories to automatically use auth state:
- `e2e/tournaments/` - Tournament-related tests
- `e2e/home/` - Homepage tests (for authenticated users)

These tests:
- ✅ Start with user logged in
- ✅ Can access protected routes
- ✅ Share auth state from setup

### Unauthenticated Tests
Place in this directory to test without auth:
- `e2e/auth/` - Login, register, forgot password tests

These tests:
- ✅ Start logged out
- ✅ Test login/registration flows
- ✅ Don't use auth storage state

### Adding New Test Directories

To add a new directory that needs authentication, update `playwright.config.ts`:

```typescript
{
  name: "chromium-authenticated",
  testMatch: /e2e\/(tournaments|home|your-new-dir)\/.*\.spec\.ts/,
  // ...
}
```

## Migration for Other Test Files

### For Authenticated Tests (tournaments, dashboard, etc.):

1. Remove login logic from `beforeEach`
2. Remove `LoginPage` import if unused
3. Place file in `e2e/tournaments/` or `e2e/home/`
4. Tests will automatically use the shared auth state

### For Unauthenticated Tests (login, register, etc.):

1. Keep existing login/form testing logic
2. Place file in `e2e/auth/`
3. Tests will run without authentication state

No changes needed to:
- `playwright.config.ts` (already configured)
- `e2e/utils/auth.setup.ts` (runs automatically)

## References

- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Storage State Documentation](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)

