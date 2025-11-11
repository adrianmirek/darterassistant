# Cloudflare Wrangler Deployment Error Fix

**Date:** November 11, 2025  
**Error:** `The process '/usr/local/bin/npx' failed with exit code 1`  
**Action:** `cloudflare/wrangler-action@v3`

## Problem

The GitHub Actions workflow is failing at the deployment stage when trying to use Wrangler to deploy to Cloudflare Pages.

## Common Causes

### 1. **Project Doesn't Exist in Cloudflare Pages** (Most Common)

The Wrangler CLI is trying to deploy to a project that hasn't been created yet in Cloudflare Pages.

**Solution:** Create the project first in Cloudflare Pages:

1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages**
3. Click **Create application** → **Pages** → **Connect to Git**
4. Connect your GitHub repository OR
5. Create a Direct Upload project with the name: `darterassistant`

**Alternative:** Use automatic project creation with the updated workflow (see below).

### 2. **Missing or Invalid GitHub Secrets**

The workflow requires these secrets to be set in GitHub:

- `CLOUDFLARE_API_TOKEN` - API token with Cloudflare Pages permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- ~~`CLOUDFLARE_PROJECT_NAME`~~ - Now hardcoded in workflow as `darterassistant`

**How to Set GitHub Secrets:**

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret

**How to Get Cloudflare API Token:**

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit Cloudflare Workers**
4. Or create custom token with these permissions:
   - **Account** → **Cloudflare Pages** → **Edit**
5. Copy the token and add as `CLOUDFLARE_API_TOKEN` in GitHub

**How to Get Cloudflare Account ID:**

1. Go to https://dash.cloudflare.com/
2. Select your account
3. Go to **Workers & Pages**
4. Your Account ID is shown in the right sidebar
5. Or check the URL: `dash.cloudflare.com/<ACCOUNT_ID>/workers-and-pages`

### 3. **Git State Issues**

Wrangler requires a clean git state or the `--commit-dirty=true` flag.

**Solution:** The workflow has been updated to include `--commit-dirty=true`.

### 4. **Wrangler Version Issues**

Sometimes the default Wrangler version in the action has compatibility issues.

**Solution:** The workflow now explicitly specifies `wranglerVersion: "3.x"`.

## Changes Made to Fix

### Updated `.github/workflows/main.yml`

Added two important parameters to the Wrangler action:

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=darterassistant --commit-dirty=true
    wranglerVersion: "3.x"
```

**What changed:**
- Added `--commit-dirty=true` flag to allow deployment even with uncommitted files
- Added `wranglerVersion: "3.x"` to use a specific Wrangler version
- Kept `--project-name=darterassistant` to specify the project

## Required GitHub Secrets Checklist

Make sure these are set in your GitHub repository:

### Required for Deployment
- [ ] `CLOUDFLARE_API_TOKEN` - API token with Pages edit permissions
- [ ] `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### Required for Build (already set if build succeeds)
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_PUBLIC_KEY` - Your Supabase anon public key
- [ ] `OPENROUTER_API_KEY` - Your OpenRouter API key

## Step-by-Step Fix

### Step 1: Verify GitHub Secrets

```bash
# Go to your repository on GitHub
# Settings → Secrets and variables → Actions
# Verify all secrets are present
```

**Check:**
- ✅ `CLOUDFLARE_API_TOKEN` exists
- ✅ `CLOUDFLARE_ACCOUNT_ID` exists
- ✅ `SUPABASE_URL` exists
- ✅ `SUPABASE_PUBLIC_KEY` exists
- ✅ `OPENROUTER_API_KEY` exists

### Step 2: Create Cloudflare Pages Project (If Doesn't Exist)

**Option A: Via Cloudflare Dashboard (Recommended)**

1. Go to https://dash.cloudflare.com/
2. **Workers & Pages** → **Create application**
3. Choose **Pages** → **Direct Upload**
4. Project name: `darterassistant`
5. Click **Create project**

**Option B: Let GitHub Actions Create It (First Deployment)**

If the project doesn't exist, Wrangler will create it automatically on first deployment. Just make sure the API token has the right permissions.

### Step 3: Set Environment Variables in Cloudflare

After creating the project, set environment variables:

1. Go to your project in Cloudflare Pages
2. **Settings** → **Environment variables**
3. Add:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLIC_KEY`
   - `OPENROUTER_API_KEY`
4. Set for both **Production** and **Preview**

### Step 4: Commit and Push Updated Workflow

```bash
git add .github/workflows/main.yml
git commit -m "Fix Cloudflare Wrangler deployment configuration"
git push origin main
```

### Step 5: Manually Trigger Workflow

1. Go to your GitHub repository
2. **Actions** tab
3. Select **Deploy to Cloudflare Pages**
4. Click **Run workflow** → **Run workflow**

### Step 6: Monitor Deployment

Watch the workflow run and check each step:

1. ✅ Lint Code
2. ✅ Unit Tests
3. ✅ Build for Cloudflare Pages
4. ✅ Deploy to Cloudflare Pages ← Should now succeed

## Troubleshooting Further Issues

### Error: "Authentication error"

**Cause:** Invalid or missing `CLOUDFLARE_API_TOKEN`

**Fix:**
1. Regenerate API token in Cloudflare
2. Make sure it has **Cloudflare Pages: Edit** permission
3. Update GitHub secret

### Error: "Account not found"

**Cause:** Invalid `CLOUDFLARE_ACCOUNT_ID`

**Fix:**
1. Double-check your Account ID in Cloudflare dashboard
2. Update GitHub secret
3. Make sure there are no extra spaces or characters

### Error: "Project not found"

**Cause:** Project doesn't exist in Cloudflare Pages

**Fix:**
1. Create the project manually in Cloudflare (see Step 2 above)
2. OR ensure API token has permission to create projects
3. Re-run the workflow

### Error: Build succeeds but deployment still fails

**Possible issues:**
1. **Dist directory is empty:** Check if build artifacts are correctly created
2. **Worker size too large:** Optimize your build or split routes
3. **Incompatible Node.js features:** Some Node.js APIs don't work in Workers

**Check build artifacts:**
```bash
# In GitHub Actions, download the build artifacts
# Verify dist/ contains:
# - _worker.js/ directory (Cloudflare Worker entry point)
# - _routes.json (routing configuration)
# - Static assets
```

## Alternative: Manual Deployment (Temporary Workaround)

If GitHub Actions continues to fail, you can deploy manually:

```bash
# Install Wrangler globally
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login

# Build your project
npm run build

# Deploy manually
wrangler pages deploy dist --project-name=darterassistant
```

This will help you test if the issue is with the build or with GitHub Actions specifically.

## Testing the Fix

### Expected Successful Workflow Output

```
✅ Lint Code - Completed
✅ Unit Tests - Completed
✅ Build for Cloudflare Pages - Completed
✅ Deploy to Cloudflare Pages - Completed
   - Checking for existing Wrangler installation
   - Installing Wrangler
   - Running Wrangler Commands
   - ✨ Deployment complete!
   - 🌎 View your site at: https://darterassistant.pages.dev
```

### Verify Deployment

1. **Check GitHub Actions:**
   - All steps should have green checkmarks ✅

2. **Check Cloudflare Pages:**
   - Go to your project → **Deployments**
   - Latest deployment should show "Success"

3. **Visit Your Site:**
   - Navigate to: `https://darterassistant.pages.dev`
   - OR your custom domain if configured
   - You should see your application (login page for unauthenticated users)

4. **Check Function Logs:**
   - In Cloudflare Pages → **Deployments** → Click latest deployment
   - Check **Function Logs** for any runtime errors

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `.github/workflows/main.yml` | Added `--commit-dirty=true` | Allow deployment with uncommitted files |
| `.github/workflows/main.yml` | Added `wranglerVersion: "3.x"` | Ensure compatible Wrangler version |

## Next Steps After Successful Deployment

1. ✅ Set up custom domain (optional)
2. ✅ Configure branch previews
3. ✅ Set up deployment notifications
4. ✅ Test your application thoroughly
5. ✅ Monitor function logs for any issues

## Additional Resources

- [Cloudflare Wrangler Action Documentation](https://github.com/cloudflare/wrangler-action)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

## Support

If you're still experiencing issues after following this guide:

1. Check the [Cloudflare Community Forum](https://community.cloudflare.com/)
2. Review Wrangler action logs in detail
3. Test manual deployment with Wrangler CLI
4. Check Cloudflare status page for service issues

---

**Status:** ✅ Workflow updated  
**Action Required:** Set GitHub secrets and create Cloudflare Pages project  
**Expected Result:** Successful automated deployment to Cloudflare Pages

