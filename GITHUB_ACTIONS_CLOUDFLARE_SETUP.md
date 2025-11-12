# GitHub Actions Cloudflare Deployment Setup

**Date:** November 11, 2025  
**Status:** Local deployment works ✅, GitHub Actions needs configuration

## Current Situation

✅ **Local deployment works perfectly**
- React 18 downgrade fixed the MessageChannel error
- Manual deployment via Wrangler CLI succeeds
- Site URL: https://99831c64.darterassistant.pages.dev (from local deploy)

❌ **GitHub Actions deployment fails**
- Needs proper Cloudflare credentials
- Needs Cloudflare Pages project setup

## The Problem

**Local deployment** uses your logged-in Wrangler credentials (via `wrangler login`).

**GitHub Actions** needs these secrets to authenticate:
- `CLOUDFLARE_API_TOKEN` - API token with Pages permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## Step-by-Step Fix

### Step 1: Get Your Cloudflare Account ID

1. Go to: **https://dash.cloudflare.com/**
2. Click on **Workers & Pages** in the left sidebar
3. Your **Account ID** is shown in the right sidebar

**Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

📋 **Copy this Account ID** - you'll need it in Step 3

### Step 2: Create Cloudflare API Token

1. Go to: **https://dash.cloudflare.com/profile/api-tokens**
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template OR create custom token

**If creating custom token, set these permissions:**
```
Account → Cloudflare Pages → Edit
Account → Account Settings → Read
```

4. Click **Continue to summary**
5. Click **Create Token**
6. **⚠️ IMPORTANT:** Copy the token NOW (it won't be shown again!)

📋 **Copy this API Token** - you'll need it in Step 3

### Step 3: Add GitHub Secrets

1. Go to your GitHub repository:
   ```
   https://github.com/adrianmirek/darterassistant/settings/secrets/actions
   ```

2. Click **New repository secret**

3. Add the first secret:
   - **Name:** `CLOUDFLARE_API_TOKEN`
   - **Value:** [Paste the API token from Step 2]
   - Click **Add secret**

4. Add the second secret:
   - **Name:** `CLOUDFLARE_ACCOUNT_ID`
   - **Value:** [Paste the Account ID from Step 1]
   - Click **Add secret**

5. Verify these existing secrets are also set:
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_PUBLIC_KEY`
   - ✅ `OPENROUTER_API_KEY`

### Step 4: Create Cloudflare Pages Project

The project name MUST be exactly: **`darterassistant`**

**Option A: Let GitHub Actions create it automatically (Recommended)**

If your API token has the right permissions, the first deployment will create the project automatically. Just proceed to Step 5.

**Option B: Create it manually in Cloudflare Dashboard**

1. Go to: **https://dash.cloudflare.com/**
2. Click **Workers & Pages**
3. Click **Create application**
4. Choose **Pages** tab
5. Click **Connect to Git** OR **Upload assets**
6. If Direct Upload:
   - Project name: **`darterassistant`** (must match exactly!)
   - Click **Create project**

### Step 5: Set Environment Variables in Cloudflare

After the project exists in Cloudflare:

1. Go to: **https://dash.cloudflare.com/**
2. Click **Workers & Pages**
3. Find and click **darterassistant** project
4. Go to **Settings** → **Environment variables**
5. Add these variables for **BOTH Production and Preview:**

   ```
   SUPABASE_URL = [your Supabase project URL]
   SUPABASE_PUBLIC_KEY = [your Supabase anon key]
   OPENROUTER_API_KEY = [your OpenRouter API key]
   ```

6. Click **Save**

### Step 6: Trigger GitHub Actions Deployment

Now that everything is configured, deploy via GitHub Actions:

1. Go to: **https://github.com/adrianmirek/darterassistant/actions**
2. Click on **Deploy to Cloudflare Pages** workflow
3. Click **Run workflow** (top right)
4. Select branch: **main**
5. Click **Run workflow** (green button)

### Step 7: Monitor the Deployment

Watch the workflow progress:

1. Click on the running workflow
2. Watch each job:
   - ✅ Lint Code
   - ✅ Unit Tests
   - ✅ Build for Cloudflare Pages
   - ✅ **Verify build artifacts** (new step - shows what's being deployed)
   - ✅ Deploy to Cloudflare Pages

3. If deployment succeeds, you'll see:
   ```
   ✨ Deployment complete!
   🌎 Deploying...
   ✨ Deployment complete!
   ```

4. Check the logs for the deployment URL

### Step 8: Access Your Site

After successful deployment, your site will be available at:

**Production URL:**
```
https://darterassistant.pages.dev
```

**Preview URLs (for each deployment):**
```
https://[commit-hash].darterassistant.pages.dev
```

You can also find the URL in:
- Cloudflare Pages dashboard → darterassistant → Deployments
- GitHub Actions workflow logs

## Troubleshooting

### Error: "Authentication error"

**Cause:** Invalid or missing `CLOUDFLARE_API_TOKEN`

**Fix:**
1. Regenerate the API token in Cloudflare
2. Make sure it has **Cloudflare Pages → Edit** permission
3. Update the GitHub secret with the new token
4. Re-run the workflow

### Error: "Account not found"

**Cause:** Invalid `CLOUDFLARE_ACCOUNT_ID`

**Fix:**
1. Double-check your Account ID in Cloudflare dashboard
2. Make sure there are no extra spaces or characters
3. Update the GitHub secret
4. Re-run the workflow

### Error: "Project not found"

**Cause:** Project `darterassistant` doesn't exist in Cloudflare

**Fix:**
1. Create the project manually (see Step 4, Option B)
2. OR ensure API token has permission to create projects
3. Re-run the workflow

### Error: Still getting MessageChannel error

**Cause:** Old build cache or React 19 is still being used

**Fix:**
1. Verify `package.json` has React 18:
   ```bash
   git log --oneline -1 package.json
   npm list react
   ```
2. If still on React 19, the changes weren't pushed
3. Delete Cloudflare Pages project and recreate it (clears cache)

### Build succeeds but site shows 404 or doesn't work

**Possible causes:**
1. Environment variables not set in Cloudflare
2. Supabase credentials are incorrect
3. Deployment succeeded but Functions have runtime errors

**Fix:**
1. Check environment variables in Cloudflare (Step 5)
2. Check Function logs in Cloudflare:
   - Go to project → Deployments → Click latest deployment
   - Check **Function Logs** for errors
3. Test the API endpoints manually

## Verification Checklist

Before running GitHub Actions deployment:

### GitHub Secrets (Must Have)
- [ ] `CLOUDFLARE_API_TOKEN` - Set with correct permissions
- [ ] `CLOUDFLARE_ACCOUNT_ID` - Set with correct ID
- [ ] `SUPABASE_URL` - Already set (build succeeded before)
- [ ] `SUPABASE_PUBLIC_KEY` - Already set
- [ ] `OPENROUTER_API_KEY` - Already set

### Cloudflare API Token Permissions
- [ ] Account → Cloudflare Pages → Edit
- [ ] Account → Account Settings → Read (optional but recommended)

### Cloudflare Pages Project
- [ ] Project named `darterassistant` exists OR
- [ ] API token has permission to create it

### Cloudflare Environment Variables
- [ ] `SUPABASE_URL` set in Production
- [ ] `SUPABASE_URL` set in Preview
- [ ] `SUPABASE_PUBLIC_KEY` set in Production
- [ ] `SUPABASE_PUBLIC_KEY` set in Preview
- [ ] `OPENROUTER_API_KEY` set in Production
- [ ] `OPENROUTER_API_KEY` set in Preview

### Code Changes
- [x] React 18 installed (confirmed)
- [x] Build succeeds locally (confirmed)
- [x] Manual Wrangler deployment works (confirmed)
- [x] Changes committed and pushed (confirmed)

## Expected Successful Output

When GitHub Actions runs successfully, you should see:

```
✅ Lint Code - Completed
✅ Unit Tests - Completed
✅ Build for Cloudflare Pages - Completed
✅ Verify build artifacts - Shows dist/ contents
✅ Deploy to Cloudflare Pages - Completed
   📥 Installing Wrangler
   🚀 Running Wrangler Commands
   ✨ Success! Uploaded X files
   ✨ Compiled Worker successfully
   ✨ Uploading Worker bundle
   🌎 Deploying...
   ✨ Deployment complete! 
   🌎 https://darterassistant.pages.dev
```

## Quick Command Reference

```bash
# Check current React version
npm list react react-dom

# Check git status
git status

# Build locally
npm run build

# Deploy manually (for testing)
npx wrangler pages deploy dist --project-name=darterassistant

# View wrangler config
cat wrangler.toml

# Check GitHub Actions status (if you have gh CLI)
gh run list --workflow "Deploy to Cloudflare Pages"
```

## URLs Reference

| Purpose | URL |
|---------|-----|
| GitHub Repo | https://github.com/adrianmirek/darterassistant |
| GitHub Secrets | https://github.com/adrianmirek/darterassistant/settings/secrets/actions |
| GitHub Actions | https://github.com/adrianmirek/darterassistant/actions |
| Cloudflare Dashboard | https://dash.cloudflare.com/ |
| Cloudflare API Tokens | https://dash.cloudflare.com/profile/api-tokens |
| Production Site | https://darterassistant.pages.dev |

## Summary

The **React 18 downgrade fixed the MessageChannel error** ✅

Now you need to:
1. ✅ Get Cloudflare Account ID
2. ✅ Create Cloudflare API Token
3. ✅ Add both as GitHub Secrets
4. ✅ Create/verify Cloudflare Pages project exists
5. ✅ Set environment variables in Cloudflare
6. ✅ Run GitHub Actions workflow

Once these are configured, GitHub Actions will deploy successfully!

---

**Status:** Waiting for Cloudflare credentials configuration  
**Next Step:** Complete Steps 1-6 above

