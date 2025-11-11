# Cloudflare Pages Deployment Troubleshooting Checklist

**Date:** November 11, 2025  
**Current Issue:** Wrangler deployment failing with exit code 1

## ✅ Pre-Deployment Verification

### 1. GitHub Secrets Configuration

Check that ALL required secrets are set in your GitHub repository:

**Go to:** `https://github.com/adrianmirek/darterassistant/settings/secrets/actions`

Required secrets:
- [ ] `CLOUDFLARE_API_TOKEN` - Must have Cloudflare Pages Edit permissions
- [ ] `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_PUBLIC_KEY` - Your Supabase anon/public key
- [ ] `OPENROUTER_API_KEY` - Your OpenRouter API key

**How to verify:**
1. Go to the secrets page
2. You should see the secret names listed (values are hidden)
3. If any are missing, add them now

### 2. Cloudflare API Token Permissions

Your `CLOUDFLARE_API_TOKEN` MUST have the correct permissions:

**Required Permissions:**
- Account → Cloudflare Pages → Edit
- Account → Account Settings → Read (recommended)

**How to check/create the token:**

1. Go to: `https://dash.cloudflare.com/profile/api-tokens`
2. Find your existing token OR click "Create Token"
3. Use template: **Edit Cloudflare Workers** OR create custom with above permissions
4. Copy the token and update GitHub secret if needed

**⚠️ Common mistake:** Using API Key instead of API Token (they're different!)

### 3. Cloudflare Account ID

**How to find your Account ID:**

1. Go to: `https://dash.cloudflare.com/`
2. Click on "Workers & Pages" in the left sidebar
3. Your Account ID is displayed in the right sidebar
4. OR check the URL: `dash.cloudflare.com/{ACCOUNT_ID}/workers-and-pages`

**Example format:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

**Verify in GitHub:**
- [ ] Account ID matches exactly (no spaces, correct format)

### 4. Cloudflare Pages Project

**Check if project exists:**

1. Go to: `https://dash.cloudflare.com/`
2. Navigate to **Workers & Pages**
3. Look for a project named: `darterassistant`

**If project DOES NOT exist, create it:**

**Option A: Create via Dashboard (Recommended)**
1. Click **Create application** → **Pages**
2. Choose **Direct Upload** (not Git)
3. Project name: `darterassistant` (must match exactly)
4. Click **Create project**

**Option B: Let Wrangler create it (requires correct permissions)**
- API token must have "Account Settings → Read" permission
- First deployment will auto-create the project

**Status:**
- [ ] Project `darterassistant` exists in Cloudflare Pages
- [ ] OR API token has permission to create projects

### 5. Environment Variables in Cloudflare

After project is created, set environment variables:

1. Go to your project in Cloudflare Pages
2. **Settings** → **Environment variables**
3. Add for **both Production AND Preview:**
   - [ ] `SUPABASE_URL`
   - [ ] `SUPABASE_PUBLIC_KEY`
   - [ ] `OPENROUTER_API_KEY`

**⚠️ Important:** Set them for BOTH environments!

## 🔍 Debugging Steps

### Step 1: Check Previous Workflow Logs

1. Go to: `https://github.com/adrianmirek/darterassistant/actions`
2. Click on the failed workflow run
3. Expand the "Deploy to Cloudflare Pages" step
4. Look for specific error messages before "exit code 1"

**Common error patterns to look for:**
- `Authentication error` → Invalid API token
- `Account not found` → Wrong Account ID
- `Project not found` → Project doesn't exist
- `Permission denied` → API token lacks permissions
- `Invalid worker bundle` → Build issue

### Step 2: Verify Build Artifacts

The new workflow includes a verification step. Check the output:

1. In the failed workflow, look for "Verify build artifacts" step
2. Verify these files exist:
   - `dist/_worker.js/` (directory)
   - `dist/_routes.json` (file)
   - `dist/favicon.png` and other static assets

**If artifacts are missing:**
- Build succeeded but didn't create proper output
- Check `astro.config.mjs` for Cloudflare adapter configuration

### Step 3: Test Manual Deployment

Test if deployment works manually (bypasses GitHub Actions issues):

```bash
# Install Wrangler globally
npm install -g wrangler

# Authenticate (opens browser)
wrangler login

# Build the project
npm run build

# Deploy manually
wrangler pages deploy dist --project-name=darterassistant
```

**If manual deployment works:**
- Issue is with GitHub Actions configuration
- Check secrets again

**If manual deployment fails:**
- Issue is with Cloudflare configuration or build
- Read error message for specific cause

### Step 4: Check Cloudflare Status

Verify Cloudflare services are operational:

1. Go to: `https://www.cloudflarestatus.com/`
2. Check if "Cloudflare Pages" has any incidents

## 🚀 Re-running Deployment

After verifying the checklist:

1. **Commit the updated workflow:**
   ```bash
   git add .github/workflows/main.yml
   git commit -m "Add build artifacts verification to deployment workflow"
   git push origin main
   ```

2. **Manually trigger the workflow:**
   - Go to: `https://github.com/adrianmirek/darterassistant/actions`
   - Click "Deploy to Cloudflare Pages"
   - Click **Run workflow** → **Run workflow**

3. **Monitor the deployment:**
   - Watch each step complete
   - Check the new "Verify build artifacts" output
   - Read the Wrangler deployment logs carefully

## ✅ Success Indicators

Your deployment is successful when:

- [ ] All GitHub Actions steps show green checkmarks ✅
- [ ] Deployment log shows: `✨ Deployment complete!`
- [ ] Site URL is shown: `https://darterassistant.pages.dev`
- [ ] Visiting the URL shows your application (not 404 or error page)
- [ ] You can navigate and use the application

## 🔧 Alternative Solutions

### If GitHub Actions continues to fail:

**Option 1: Use Wrangler CLI manually**
```bash
# One-time setup
npm install -g wrangler
wrangler login

# For each deployment
npm run build
wrangler pages deploy dist --project-name=darterassistant
```

**Option 2: Connect Git repository directly**
1. Go to Cloudflare Pages
2. Create new project → Connect to Git
3. Select your repository
4. Set build command: `npm run build`
5. Set output directory: `dist`
6. Add environment variables
7. Let Cloudflare handle deployments automatically on push

**Option 3: Try different Wrangler action configuration**

Update `.github/workflows/main.yml` deploy step:

```yaml
- name: Deploy to Cloudflare Pages
  run: |
    npm install -g wrangler
    wrangler pages deploy dist --project-name=darterassistant
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

This uses direct CLI instead of the action.

## 📋 Quick Reference

**GitHub Repository:**  
`https://github.com/adrianmirek/darterassistant`

**GitHub Secrets:**  
`https://github.com/adrianmirek/darterassistant/settings/secrets/actions`

**GitHub Actions:**  
`https://github.com/adrianmirek/darterassistant/actions`

**Cloudflare Dashboard:**  
`https://dash.cloudflare.com/`

**Cloudflare API Tokens:**  
`https://dash.cloudflare.com/profile/api-tokens`

**Expected Site URL:**  
`https://darterassistant.pages.dev`

## 🆘 Still Having Issues?

If you've completed this entire checklist and deployment still fails:

1. **Share the specific error:** Look beyond "exit code 1" in the logs
2. **Check manual deployment:** Does `wrangler pages deploy` work locally?
3. **Verify API token:** Regenerate it with correct permissions
4. **Start fresh:** Delete and recreate the Cloudflare Pages project
5. **Use Git integration:** Let Cloudflare manage deployments instead of GitHub Actions

---

**Last Updated:** November 11, 2025  
**Status:** Troubleshooting in progress  
**Next Step:** Complete checklist above and re-run workflow

