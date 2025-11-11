# E2E Environment Variables Setup Guide

This guide helps you set up the `.env.test` file for E2E testing with proper Supabase credentials.

## Create .env.test File

Create a file named `.env.test` in the root of your project with the following content:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLIC_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# E2E Test User Credentials
E2E_USERNAME_ID=00000000-0000-0000-0000-000000000000
E2E_USERNAME=test@example.com
E2E_PASSWORD=test_password

# Base URL (optional - defaults to http://localhost:3000)
BASE_URL=http://localhost:3000
```

## How to Get Your Values

### 1. SUPABASE_URL
- Go to your Supabase Dashboard
- Click on "Project Settings" (gear icon)
- Under "API", copy the "Project URL"
- Example: `https://xyzcompany.supabase.co`

### 2. SUPABASE_PUBLIC_KEY
- Same location as above (Project Settings → API)
- Copy the "anon" / "public" key
- This is the safe-to-expose public key, not the service role key!
- Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. E2E_USERNAME_ID (Most Important!)
This is the UUID of your test user from the `auth.users` table.

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Find or create your test user (e.g., `test@example.com`)
3. Click on the user
4. Copy the "User UID" field
5. Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Option B: Via SQL Editor**
```sql
SELECT id FROM auth.users WHERE email = 'test@example.com';
```

### 4. E2E_USERNAME & E2E_PASSWORD
- Email and password of your dedicated E2E test user
- **IMPORTANT:** Use a dedicated test account, never your real user account!

## Creating a Test User

If you don't have a test user yet:

**Option A: Via Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email: `test@example.com`
4. Enter a secure password
5. Click "Create User"
6. Copy the generated User UID

**Option B: Via SQL**
```sql
-- This creates a user with a specific UUID (optional)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'your-chosen-uuid-here',
  'authenticated',
  'authenticated',
  'test@example.com',
  crypt('test_password', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

## Security Checklist

- [ ] Created a dedicated test user (not using real account)
- [ ] Using `SUPABASE_PUBLIC_KEY` (anon key), NOT the service role key
- [ ] `.env.test` file is git-ignored (check `.gitignore`)
- [ ] Test user has appropriate permissions in your database
- [ ] `E2E_USERNAME_ID` matches the test user's UUID exactly

## Verification

Test your setup:

```bash
# Run E2E tests
npm run test:e2e
```

You should see cleanup output like:
```
Starting E2E database cleanup...
Cleaning up data for E2E user: a1b2c3d4-e5f6-7890-abcd-ef1234567890
✓ Tournament match results cleaned up (5 records deleted)
✓ Tournaments cleaned up (2 records deleted)
E2E database cleanup completed successfully
Note: Only data for E2E user was deleted. Other users' data remains intact.
```

## Troubleshooting

### "SUPABASE_URL and SUPABASE_PUBLIC_KEY must be set in environment variables"
- Verify `.env.test` file exists in the project root
- Check that variable names match exactly (including case)
- Ensure no extra spaces or quotes around values

### "No tournaments found for cleanup" (but you created test data)
- Double-check `E2E_USERNAME_ID` matches your test user's UUID
- Verify test data was created with the correct `user_id`
- Query to check: `SELECT * FROM tournaments WHERE user_id = 'your-e2e-user-id'`

### "Error fetching tournaments" / "Error deleting tournaments"
- Verify Supabase credentials are correct
- Check network connectivity to Supabase
- Ensure test user exists and has proper permissions
- Review RLS (Row Level Security) policies if enabled

## Important Reminders

🔒 **Security:**
- The cleanup is **user-scoped** and only affects data where `user_id = E2E_USERNAME_ID`
- Other users' data is **never** touched by the cleanup process
- Always use a dedicated test user, never your real account

📝 **Note:**
- The `.env.test` file is automatically loaded by Playwright config
- Changes to `.env.test` require restarting the test server
- The cleanup runs automatically after **all** E2E tests complete

## Example Complete .env.test

```env
# Real example (with fake values)
SUPABASE_URL=https://abcdefghijklmno.supabase.co
SUPABASE_PUBLIC_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ubyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MTU1Nzc2MDB9.fake_signature_here

E2E_USERNAME_ID=12345678-1234-1234-1234-123456789abc
E2E_USERNAME=e2e.test@example.com
E2E_PASSWORD=SecureTestPassword123!

BASE_URL=http://localhost:3000
```

---

✅ Once configured, your E2E tests will automatically clean up after themselves!

