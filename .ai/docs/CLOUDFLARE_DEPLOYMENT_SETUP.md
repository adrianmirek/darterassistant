# Cloudflare Pages Deployment Setup

This document outlines the changes made to adapt the project for deployment to Cloudflare Pages and the setup of CI/CD pipeline.

## Changes Made

### 1. Astro Configuration (`astro.config.mjs`)
- **Changed:** Replaced `@astrojs/node` adapter with `@astrojs/cloudflare`
- **Reason:** Cloudflare Pages requires the Cloudflare-specific adapter for SSR support
- **Configuration:** Added `platformProxy.enabled: true` for local development with Cloudflare bindings

### 2. Dependencies (`package.json`)
- **Removed:** `@astrojs/node` (v9.4.3)
- **Added:** `@astrojs/cloudflare` (v11.3.0)
- **Action Required:** Run `npm install` to update dependencies

### 3. CI/CD Pipeline (`.github/workflows/main.yml`)
Created a new deployment workflow with the following stages:

#### Stage 1: Lint
- Runs ESLint on the entire codebase
- Uses Node.js version from `.nvmrc` (22.14.0)

#### Stage 2: Unit Tests
- Runs unit tests with coverage
- Uploads coverage artifacts (retained for 7 days)
- Depends on successful lint stage

#### Stage 3: Build
- Builds the application with environment variables:
  - `SUPABASE_URL`
  - `SUPABASE_PUBLIC_KEY`
  - `OPENROUTER_API_KEY`
- Uploads build artifacts to be used in deployment
- Depends on successful lint and unit test stages

#### Stage 4: Deploy
- Uses `cloudflare/wrangler-action@v3`
- Deploys to Cloudflare Pages using Wrangler CLI
- Requires production environment approval
- Depends on successful build stage

#### Stage 5: Status Notification
- Creates deployment summary in GitHub Actions
- Shows status of all stages with emojis
- Runs regardless of previous stage results

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### Repository Secrets
1. **SUPABASE_URL** - Your Supabase project URL
   - Format: `https://PROJECT_ID.supabase.co`
   
2. **SUPABASE_PUBLIC_KEY** - Your Supabase anonymous/public key

3. **OPENROUTER_API_KEY** - Your OpenRouter API key for AI services

### Cloudflare-Specific Secrets
4. **CLOUDFLARE_API_TOKEN** - Cloudflare API token with Pages permissions
   - Go to: Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "Cloudflare Pages: Edit" permissions
   
5. **CLOUDFLARE_ACCOUNT_ID** - Your Cloudflare account ID
   - Found in: Cloudflare Dashboard → Account Home (right sidebar)
   
6. **CLOUDFLARE_PROJECT_NAME** - Your Cloudflare Pages project name
   - The name of your existing Cloudflare Pages project

### Setting Up Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

## GitHub Actions Versions Used

All actions use the latest major versions (as of November 2025):

- `actions/checkout@v4` - Checkout repository code
- `actions/setup-node@v4` - Setup Node.js environment
- `actions/upload-artifact@v4` - Upload build artifacts
- `actions/download-artifact@v4` - Download build artifacts
- `cloudflare/wrangler-action@v3` - Deploy to Cloudflare Pages

## Workflow Triggers

### `main.yml` (Deployment)
- **Trigger:** Push to `main` branch
- **Concurrency:** Cancels in-progress runs for the same branch
- **Environment:** Uses `production` environment (requires manual approval if configured)

### `pull-request.yml` (PR Validation)
- **Trigger:** Pull request to `main` branch
- **Stages:** Lint, Unit Tests, E2E Tests, Status Comment
- **No deployment:** Only validates code quality

## Environment Setup

### Production Environment (Optional but Recommended)
Create a `production` environment in GitHub for manual deployment approvals:
1. Go to: Repository → Settings → Environments → New environment
2. Name: `production`
3. Configure protection rules:
   - Required reviewers (optional)
   - Wait timer (optional)
   - Deployment branches: Only `main`

## Local Development

After installing dependencies, you can run:

```bash
# Install new dependencies
npm install

# Development server (with Cloudflare platform proxy)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Differences from Pull Request Workflow

The main deployment workflow (`main.yml`) differs from the PR workflow (`pull-request.yml`):

1. **No E2E Tests:** E2E tests are skipped in deployment (as per requirements)
2. **Build Stage:** Added explicit build stage with environment variables
3. **Deploy Stage:** Added Cloudflare Pages deployment
4. **Trigger:** Runs on push to `main` instead of PR
5. **Summary:** Uses GitHub Step Summary instead of PR comments

## Cloudflare Pages Configuration

### Build Configuration
If you need to configure Cloudflare Pages project settings:

1. **Build command:** `npm run build`
2. **Build output directory:** `dist`
3. **Root directory:** `/` (project root)
4. **Environment variables:** Set in Cloudflare Pages settings:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLIC_KEY`
   - `OPENROUTER_API_KEY`

**Note:** Environment variables can be set either in Cloudflare Pages dashboard OR passed through GitHub Actions (current setup uses GitHub secrets).

## Testing the Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Test local build:**
   ```bash
   npm run build
   ```

3. **Commit and push to a feature branch:**
   ```bash
   git add .
   git commit -m "Configure Cloudflare Pages deployment"
   git push origin feature-branch
   ```

4. **Create PR to `main`:**
   - PR workflow will run (lint + unit tests)
   - Review and merge

5. **After merge to `main`:**
   - Deployment workflow will automatically run
   - Check GitHub Actions tab for deployment status

## Troubleshooting

### Common Issues

1. **Build fails with module not found:**
   - Run `npm install` to install `@astrojs/cloudflare`

2. **Deployment fails with authentication error:**
   - Verify `CLOUDFLARE_API_TOKEN` has correct permissions
   - Verify `CLOUDFLARE_ACCOUNT_ID` is correct

3. **Deployment succeeds but site doesn't work:**
   - Check environment variables in Cloudflare Pages dashboard
   - Verify `CLOUDFLARE_PROJECT_NAME` matches your project

4. **TypeScript errors:**
   - The linter error for `@astrojs/cloudflare` will resolve after running `npm install`

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure GitHub secrets (see above)
3. ✅ Test local build
4. ✅ Commit and push changes
5. ✅ Verify deployment works

## Additional Resources

- [Astro Cloudflare Adapter Docs](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler Action Docs](https://github.com/cloudflare/wrangler-action)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

