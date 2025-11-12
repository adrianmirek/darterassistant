# Authentication Setup Guide - Darter Assistant

## Overview

This guide walks you through the steps required to set up authentication for the Darter Assistant application using Supabase Auth.

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Basic understanding of environment variables

## Step 1: Supabase Project Setup

### 1.1 Create or Use Existing Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Create a new project or use your existing Darter Assistant project
3. Wait for the project to be fully initialized

### 1.2 Get Project Credentials

1. In your Supabase dashboard, navigate to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (the public API key)

## Step 2: Configure Environment Variables

### 2.1 Create `.env` File

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLIC_KEY=your-anon-public-key

# Application Configuration
SITE_URL=http://localhost:4321

# AI Service (existing)
OPENROUTER_API_KEY=sk-or-v1-your-key
```

### 2.2 Update `.env.example`

Update your `.env.example` file to include the new authentication variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_PUBLIC_KEY=eyJhbGc...
SITE_URL=http://localhost:4321

# AI Service
OPENROUTER_API_KEY=sk-or-v1-xxx
```

## Step 3: Supabase Authentication Configuration

### 3.1 Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure the following settings:
   - **Enable email confirmations**: OFF (for MVP)
   - **Enable email signups**: ON

### 3.2 Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   - Development: `http://localhost:4321`
   - Production: `https://yourdomain.com`

### 3.3 Configure Redirect URLs

Add the following redirect URLs:

**Development:**
- `http://localhost:4321/**`

**Production:**
- `https://yourdomain.com/**`

## Step 4: Database Migration

### 4.1 Verify Existing Schema

Your database should already have the authentication-related tables from the initial migration:

- `tournaments` table with `user_id` column
- `tournament_match_results` table
- `goals` table with `user_id` column
- RLS (Row Level Security) policies enabled

### 4.2 Clear Test Data (Recommended for MVP)

Since the MVP is in development phase, it's recommended to clear existing test data:

```sql
-- Clear test tournament data
DELETE FROM tournament_match_results;
DELETE FROM tournaments;
DELETE FROM goals;
```

This provides a clean slate for testing authentication with real users.

## Step 5: Install Dependencies

The required packages are already included in the project:

```bash
npm install
```

**Required packages:**
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side rendering support
- `zod` - Input validation
- `react-hook-form` - Form handling
- `@hookform/resolvers` - React Hook Form + Zod integration

## Step 6: Test Authentication Flow

### 6.1 Start Development Server

```bash
npm run dev
```

### 6.2 Test Registration (Future Phase)

Registration functionality will be implemented in the next phase.

### 6.3 Test Login

1. Create a test user directly in Supabase:
   - Go to **Authentication** → **Users** in Supabase dashboard
   - Click **Add user** → **Create new user**
   - Enter email and password
   - Click **Create user**

2. Test the login flow:
   - Navigate to `http://localhost:4321/auth/login`
   - Enter the test user credentials
   - Click "Sign in"
   - You should be redirected to `/` with the AddTournamentForm visible
   - User email and logout button should appear in the header

### 6.4 Test Protected Routes

1. Clear browser cookies or open incognito window
2. Try to access `http://localhost:4321/`
3. You should be redirected to `/auth/login`
4. After login, you should be able to access `/` and see the AddTournamentForm

### 6.5 Test Logout

1. While logged in, click the "Logout" button in the header
2. You should be redirected to `/auth/login`
3. Try to access `/` again - you should be redirected to login

## Step 7: Verify Data Isolation

1. Create a second test user in Supabase dashboard
2. Log in as first user and create a tournament
3. Log out and log in as second user
4. Verify that the second user cannot see the first user's tournament data
5. This confirms RLS (Row Level Security) is working correctly

## Troubleshooting

### Issue: "Invalid API key" or "Failed to fetch"

**Solution:** 
- Verify `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY` in `.env` are correct
- Ensure you're using the **anon/public** key, not the service role key
- Restart the development server after changing `.env`

### Issue: "Email not confirmed" error

**Solution:**
- Go to Supabase dashboard → **Authentication** → **Providers**
- Disable "Enable email confirmations" (MVP setting)
- Or manually confirm the user in **Authentication** → **Users**

### Issue: User redirected to login after successful authentication

**Solution:**
- Check browser console for errors
- Verify cookies are being set (check browser DevTools → Application → Cookies)
- Ensure `SITE_URL` matches your development URL

### Issue: Cannot access protected routes even when logged in

**Solution:**
- Check middleware logs in terminal
- Verify `src/middleware/index.ts` is not throwing errors
- Clear browser cookies and try logging in again

### Issue: RLS preventing data access

**Solution:**
- Verify the user is properly authenticated (check `context.locals.user` in middleware)
- Ensure RLS policies are correctly configured in Supabase
- Check Supabase logs for RLS-related errors

## Security Checklist

Before deploying to production:

- [ ] Change `SUPABASE_PUBLIC_KEY` to use environment-specific keys
- [ ] Set `SITE_URL` to production domain
- [ ] Configure proper redirect URLs in Supabase
- [ ] Enable HTTPS in production (set `secure: true` in cookies)
- [ ] Review and test all RLS policies
- [ ] Enable email confirmation (post-MVP)
- [ ] Set up proper error logging and monitoring
- [ ] Configure rate limiting for authentication endpoints

## Next Steps (Post-MVP)

1. **User Registration**: Implement registration form and API
2. **Password Recovery**: Implement forgot password and reset password flows
3. **Email Templates**: Customize Supabase email templates
4. **Email Verification**: Enable and implement email confirmation
5. **Profile Management**: Add user profile editing functionality
6. **Social Login**: Consider adding OAuth providers (Google, GitHub)

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Astro SSR Documentation](https://docs.astro.build/en/guides/server-side-rendering/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs in dashboard
3. Check browser console for client-side errors
4. Review server logs in terminal for API errors

---

Last updated: November 7, 2025

