# Cloudflare Pages Environment Variables Setup

This guide explains how to configure environment variables for your Cloudflare Pages deployment.

## Required Environment Variables

Your application requires the following environment variables to be set in Cloudflare Pages:

1. **SUPABASE_URL** - Your Supabase project URL
   - Format: `https://PROJECT_ID.supabase.co`
   - Found in: Supabase Dashboard → Project Settings → API

2. **SUPABASE_PUBLIC_KEY** - Your Supabase anonymous/public key
   - Also called "anon" or "public" key
   - Found in: Supabase Dashboard → Project Settings → API → Project API keys
   - This is the key labeled as "anon public"

3. **OPENROUTER_API_KEY** - Your OpenRouter API key for AI services
   - Get from: https://openrouter.ai/keys

## Setting Environment Variables in Cloudflare Pages

### Method 1: Via Cloudflare Dashboard (Recommended)

1. **Navigate to your project:**
   - Go to https://dash.cloudflare.com/
   - Select your account
   - Go to **Workers & Pages**
   - Click on your project name

2. **Access Settings:**
   - Click on the **Settings** tab
   - Scroll down to **Environment variables** section

3. **Add variables:**
   - Click **Add variable**
   - Enter the variable name (e.g., `SUPABASE_URL`)
   - Enter the variable value
   - Choose environment:
     - **Production** - for main branch deployments
     - **Preview** - for pull request previews
     - Both (recommended for initial setup)
   - Click **Save**

4. **Repeat for all three variables:**
   - `SUPABASE_URL`
   - `SUPABASE_PUBLIC_KEY`
   - `OPENROUTER_API_KEY`

### Method 2: Via Wrangler CLI

If you prefer using the command line:

```bash
# Set production environment variables
wrangler pages project variables set SUPABASE_URL="https://YOUR_PROJECT.supabase.co" --project-name=darterassistant
wrangler pages project variables set SUPABASE_PUBLIC_KEY="your_supabase_anon_key" --project-name=darterassistant
wrangler pages project variables set OPENROUTER_API_KEY="your_openrouter_key" --project-name=darterassistant
```

Replace `darterassistant` with your actual Cloudflare Pages project name if different.

## Important Notes

### Security Considerations

- **Never commit sensitive values** to your repository
- The `SUPABASE_PUBLIC_KEY` is safe to expose on the client side (it's called "anon public" for this reason)
- Keep `OPENROUTER_API_KEY` secure
- Cloudflare encrypts environment variables at rest

### After Setting Variables

After setting or updating environment variables:

1. **Trigger a new deployment:**
   - Push a new commit to your main branch, OR
   - Go to **Deployments** tab in Cloudflare Pages
   - Click **Retry deployment** on the latest deployment

2. **Verify the deployment:**
   - Check the deployment logs for any errors
   - Visit your site to confirm it's working
   - Check browser console for any client-side errors

### Troubleshooting

If you still see errors after setting environment variables:

1. **Check variable names:**
   - Ensure they match exactly: `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `OPENROUTER_API_KEY`
   - Environment variables are case-sensitive

2. **Check values:**
   - No extra spaces before or after the value
   - No quotes around the value (Cloudflare adds them automatically)
   - URLs should include `https://`

3. **Verify deployment:**
   - Make sure you triggered a new deployment after setting variables
   - Old deployments won't have the new variables

4. **Check deployment logs:**
   - Go to your project → **Deployments** tab
   - Click on the latest deployment
   - Check the **Function Logs** for startup errors
   - You should see: `✓ All required environment variables are set`

## Testing Locally

To test with the same environment variables locally:

1. **Create a `.env` file** in your project root (if not exists):
   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_PUBLIC_KEY=your_supabase_anon_key
   OPENROUTER_API_KEY=your_openrouter_key
   ```

2. **Run the dev server:**
   ```bash
   npm run dev
   ```

3. **Note:** The `.env` file is gitignored and should never be committed.

## Getting Your Supabase Keys

If you don't have your Supabase keys handy:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **Settings** (gear icon in left sidebar)
4. Click on **API** in the settings menu
5. Copy the values:
   - **Project URL** → Use for `SUPABASE_URL`
   - **Project API keys** → **anon public** → Use for `SUPABASE_PUBLIC_KEY`

## Getting Your OpenRouter API Key

If you don't have an OpenRouter API key:

1. Go to https://openrouter.ai/
2. Sign up or log in
3. Navigate to https://openrouter.ai/keys
4. Create a new API key
5. Copy the key → Use for `OPENROUTER_API_KEY`

## Next Steps

After setting up environment variables:

1. ✅ Set all three environment variables in Cloudflare Pages
2. ✅ Trigger a new deployment (push to main or retry deployment)
3. ✅ Check deployment logs for the success message
4. ✅ Visit your site and test the functionality
5. ✅ Check browser console for any errors

## Support

If you continue to experience issues:

1. Check the Cloudflare Pages deployment logs
2. Check your browser's developer console
3. Verify all environment variables are set correctly
4. Ensure you're using the latest deployment (not an old cached one)

