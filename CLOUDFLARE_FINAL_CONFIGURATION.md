# Cloudflare Final Configuration - Make Your Site Work

**Status:** ✅ Deployment SUCCESSFUL, but site needs configuration to run

## What's Happening

Your deployment succeeded! The code is on Cloudflare's servers, but:

1. ❌ **Missing SESSION KV binding** - Your app uses sessions
2. ❌ **Missing environment variables** - Supabase and OpenRouter credentials
3. ❌ **These cause runtime errors** - Site deploys but doesn't work

## Step 1: Find Your Site URL

1. Go to: **https://dash.cloudflare.com/**
2. Click **Workers & Pages**
3. Click **darterassistant** project
4. Click **Deployments** tab
5. You'll see your latest deployment with a URL like:
   - Production: `https://darterassistant.pages.dev`
   - Or Preview: `https://[hash].darterassistant.pages.dev`

📋 **Copy this URL** - try opening it in your browser

## Step 2: Set Up SESSION KV Namespace

Your app needs a KV namespace for sessions. Let's create it:

### Create KV Namespace

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Click **KV** in the left sidebar (or go to Overview → KV)
3. Click **Create a namespace**
4. Name it: `darterassistant-sessions` (or just `SESSION`)
5. Click **Add**

### Bind KV to Your Project

1. Go back to **Workers & Pages** → **darterassistant**
2. Go to **Settings** → **Functions**
3. Scroll to **KV namespace bindings**
4. Click **Add binding**
5. Set:
   - **Variable name:** `SESSION` (must be exactly this)
   - **KV namespace:** Select the namespace you just created
6. Click **Save**

**Alternative:** Update `wrangler.toml` (I'll do this for you below)

## Step 3: Set Environment Variables

Your app needs these to connect to Supabase and OpenRouter:

1. In your project, go to **Settings** → **Environment variables**
2. Click **Add variables**
3. Add these for **BOTH Production AND Preview**:

```
SUPABASE_URL = [your Supabase project URL]
SUPABASE_PUBLIC_KEY = [your Supabase anon/public key]
OPENROUTER_API_KEY = [your OpenRouter API key]
```

**Where to find these:**

### Supabase Credentials
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Copy:
   - **Project URL** → Use for `SUPABASE_URL`
   - **anon public** key → Use for `SUPABASE_PUBLIC_KEY`

### OpenRouter API Key
1. Go to: https://openrouter.ai/keys
2. Copy your API key → Use for `OPENROUTER_API_KEY`

### Add to Cloudflare

For each variable:
1. Click **Add variable**
2. **Variable name:** (e.g., `SUPABASE_URL`)
3. **Value:** [paste the value]
4. **Environment:** Choose both **Production** and **Preview**
5. Click **Save**

## Step 4: Update wrangler.toml for KV Binding

Let me update your `wrangler.toml` to include the KV binding:

