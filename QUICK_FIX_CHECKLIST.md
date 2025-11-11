# 🚀 Quick Fix Checklist - Cloudflare Wrangler Deployment Error

## ⚡ Immediate Actions

### 1. ✅ Update Workflow (DONE)
The workflow file has been updated with:
- Added `--commit-dirty=true` flag
- Added `wranglerVersion: "3.x"`

### 2. 🔑 Verify GitHub Secrets

Go to: `GitHub Repository → Settings → Secrets and variables → Actions`

Check these secrets exist:

| Secret Name | Status | How to Get |
|------------|--------|------------|
| `CLOUDFLARE_API_TOKEN` | ❓ | [Get Token](https://dash.cloudflare.com/profile/api-tokens) → Create Token → Edit Cloudflare Workers |
| `CLOUDFLARE_ACCOUNT_ID` | ❓ | [Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Right sidebar |
| `SUPABASE_URL` | ❓ | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_PUBLIC_KEY` | ❓ | Supabase Dashboard → Settings → API → anon public key |
| `OPENROUTER_API_KEY` | ❓ | [OpenRouter Keys](https://openrouter.ai/keys) |

### 3. 🌐 Create Cloudflare Pages Project

**Check if project exists:**
1. Go to https://dash.cloudflare.com/
2. Navigate to **Workers & Pages**
3. Look for project named `darterassistant`

**If project doesn't exist:**
1. Click **Create application** → **Pages**
2. Choose **Direct Upload**
3. Project name: `darterassistant`
4. Click **Create project**

### 4. 📤 Commit and Deploy

```bash
# Commit the workflow fix
git add .github/workflows/main.yml CLOUDFLARE_WRANGLER_DEPLOYMENT_FIX.md QUICK_FIX_CHECKLIST.md
git commit -m "Fix Cloudflare Wrangler deployment error"
git push origin main
```

### 5. ▶️ Trigger Workflow

**Option A: Automatic (on push to main)**
- Pushing to main will automatically trigger deployment

**Option B: Manual trigger**
1. Go to GitHub → **Actions** tab
2. Select **Deploy to Cloudflare Pages**
3. Click **Run workflow**

## 🎯 Expected Successful Output

```
✅ Lint Code
✅ Unit Tests  
✅ Build for Cloudflare Pages
✅ Deploy to Cloudflare Pages
   → ✨ Deployment complete!
   → 🌎 https://darterassistant.pages.dev
```

## ⚠️ If Still Failing

### Check These First:

1. **GitHub Secrets**
   - All 5 secrets present?
   - No typos in secret names?
   - No extra spaces in values?

2. **Cloudflare API Token**
   - Has "Cloudflare Pages: Edit" permission?
   - Not expired?
   - Correct account?

3. **Cloudflare Project**
   - Project `darterassistant` exists?
   - In the correct account?

4. **Build Artifacts**
   - Build step succeeded?
   - Dist folder uploaded?

### Quick Diagnostic Commands

```bash
# Test build locally
npm run build

# Check dist folder created
ls -la dist/

# Check for _worker.js (required for Cloudflare)
ls -la dist/_worker.js/

# Manual deployment test (requires wrangler login)
npx wrangler pages deploy dist --project-name=darterassistant
```

## 📚 Detailed Documentation

- **Full troubleshooting guide:** `CLOUDFLARE_WRANGLER_DEPLOYMENT_FIX.md`
- **Environment setup:** `CLOUDFLARE_ENV_SETUP.md`
- **General deployment:** `CLOUDFLARE_DEPLOYMENT_SETUP.md`

## 🔗 Quick Links

- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [GitHub Secrets Settings](../../settings/secrets/actions)
- [GitHub Actions Tab](../../actions)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [OpenRouter Keys](https://openrouter.ai/keys)

## 💬 Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Authentication error` | Invalid API token | Regenerate token with correct permissions |
| `Account not found` | Wrong account ID | Double-check account ID |
| `Project not found` | Project doesn't exist | Create project in Cloudflare |
| `exit code 1` | Multiple possible causes | Check GitHub secrets, project exists, API token |

---

**Need More Help?** Check `CLOUDFLARE_WRANGLER_DEPLOYMENT_FIX.md` for detailed troubleshooting.

