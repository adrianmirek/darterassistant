# Vercel Deployment Guide

## Quick Start

Your project has been migrated from Cloudflare Pages to Vercel to support Playwright web scraping.

### 1. Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy to Vercel

For testing/preview:
```bash
vercel
```

For production:
```bash
vercel --prod
```

## What Was Changed

1. ✅ Removed `@astrojs/cloudflare` adapter
2. ✅ Installed `@astrojs/vercel` adapter
3. ✅ Moved `@playwright/test` from devDependencies to dependencies
4. ✅ Updated `astro.config.mjs` to use Vercel adapter
5. ✅ Created `vercel.json` with optimized serverless function settings:
   - 3008 MB memory (needed for Playwright browser)
   - 60 seconds max duration
6. ✅ Created `.vercelignore` to exclude unnecessary files
7. ✅ Installed Chromium browser locally

## Environment Variables

Make sure to add your environment variables in Vercel dashboard:
- Go to your project settings
- Navigate to "Environment Variables"
- Add all variables from your `.env` file

## Important Notes

- **Playwright on Vercel**: Vercel serverless functions support Playwright out of the box
- **Cold starts**: First request may be slower due to browser initialization
- **Function size**: Playwright increases bundle size, but Vercel handles this automatically
- **Timeout**: Functions have 60s max duration (configurable in vercel.json)

## Troubleshooting

If you get browser errors on Vercel:

1. Ensure Playwright is in `dependencies` (not devDependencies) ✅ Already done
2. Check function memory limits in vercel.json ✅ Already configured
3. View logs in Vercel dashboard: Project → Deployments → Select deployment → Runtime Logs

## Cost Considerations (Testing)

- Vercel Hobby (Free): 100GB bandwidth, 100 GB-hours function execution
- Pro Plan ($20/month): More bandwidth and execution time
- For testing, the free tier should be sufficient

## Rolling Back to Cloudflare

If you need to go back:

```bash
npm uninstall @astrojs/vercel
npm install @astrojs/cloudflare --save
# Restore original astro.config.mjs from git
```

Note: Playwright won't work on Cloudflare - you'd need to implement a different scraping solution.

