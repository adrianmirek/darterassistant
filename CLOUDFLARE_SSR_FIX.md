# Cloudflare Pages SSR Environment Variable Fix

## Problem

The Cloudflare Pages deployment was successful, but the site was inaccessible even though environment variables were correctly set in the Cloudflare dashboard. This was caused by **environment variables being accessed at module initialization time** instead of at request time.

## Root Cause

In Cloudflare Workers/Pages runtime, environment variables must be accessed at **request time**, not at **module load time**. The following issues were identified:

1. **Supabase Client** (`src/db/supabase.client.ts`): Environment variables were accessed at module level before any requests
2. **Middleware** (`src/middleware/index.ts`): Validation function was called at module initialization
3. **Image Service Conflict** (`astro.config.mjs`): Conflicting image service configurations (Sharp vs compile)

## Changes Made

### 1. Fixed Supabase Client Environment Variable Access

**File:** `src/db/supabase.client.ts`

**Before:**
```typescript
import { getRequiredEnv } from "../lib/utils/env.validation";

const supabaseUrl = getRequiredEnv("SUPABASE_URL"); // ❌ Module-level access
const supabaseAnonKey = getRequiredEnv("SUPABASE_PUBLIC_KEY");

export const createSupabaseServerInstance = (context) => {
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {...});
  return supabase;
};
```

**After:**
```typescript
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  // ✅ Access at request time
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.SUPABASE_PUBLIC_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing required Supabase environment variables");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {...});
  return supabase;
};
```

### 2. Removed Module-Level Validation from Middleware

**File:** `src/middleware/index.ts`

**Before:**
```typescript
import { validateEnvironmentVariables } from "../lib/utils/env.validation";

// ❌ Module-level validation
validateEnvironmentVariables();

export const onRequest = defineMiddleware(async (context, next) => {
  // ...
});
```

**After:**
```typescript
// ✅ No module-level code, validation happens at request time in createSupabaseServerInstance
export const onRequest = defineMiddleware(async (context, next) => {
  // ...
});
```

### 3. Removed Conflicting Image Service Configuration

**File:** `astro.config.mjs`

**Before:**
```javascript
adapter: cloudflare({
  imageService: "compile",
  platformProxy: { enabled: true },
}),
image: {
  service: {
    entrypoint: "astro/assets/services/sharp", // ❌ Conflicts with Cloudflare
  },
},
```

**After:**
```javascript
adapter: cloudflare({
  imageService: "compile", // ✅ Cloudflare-compatible compile-time optimization
  platformProxy: { enabled: true },
}),
```

### 4. Added Wrangler Configuration

**File:** `wrangler.toml` (NEW)

```toml
name = "darterassistant"
compatibility_date = "2024-11-01"
pages_build_output_dir = "dist"

[env.production]
# Environment variables should be set in Cloudflare Pages dashboard

[env.preview]
# Preview environment configuration
```

### 5. Updated GitHub Actions Workflow

**File:** `.github/workflows/main.yml`

**Change:** Added automatic deployment trigger on push to `main` branch

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

## Why This Fixes the Issue

### Cloudflare Workers Runtime

Cloudflare Pages uses Cloudflare Workers for SSR, which has a different runtime model than Node.js:

1. **V8 Isolates**: Workers run in V8 isolates, not full Node.js processes
2. **Module Initialization**: Modules are initialized once and reused across requests
3. **Environment Variables**: Available through `import.meta.env` at request time, not module load time

### The Fix

By moving environment variable access **inside request handlers** (functions that run per-request), we ensure:

1. Environment variables are read from the Cloudflare Workers runtime context
2. Variables set in Cloudflare Pages dashboard are correctly accessed
3. No module-level errors that prevent the worker from initializing

## Testing

### Local Build
```bash
npm run build
```
✅ Build completes successfully

### Linting
```bash
npm run lint
```
✅ No linter errors

## Deployment Steps

1. **Commit the changes:**
   ```bash
   git add .
   git commit -m "Fix Cloudflare Pages SSR environment variable access"
   git push origin main
   ```

2. **Automatic deployment:**
   - GitHub Actions will automatically trigger on push to `main`
   - The workflow will build and deploy to Cloudflare Pages

3. **Verify deployment:**
   - Wait for GitHub Actions workflow to complete
   - Visit: https://a7cfc151.darterassistant.pages.dev/
   - You should see the login page (expected for unauthenticated users)

## Environment Variables in Cloudflare Pages

Ensure these are set in **Cloudflare Pages → Settings → Environment variables**:

| Variable Name | Required | Environment |
|--------------|----------|-------------|
| `SUPABASE_URL` | Yes | Production & Preview |
| `SUPABASE_PUBLIC_KEY` | Yes | Production & Preview |
| `OPENROUTER_API_KEY` | Yes | Production & Preview |

## Verification

After deployment, check:

1. **Site loads:** Visit the deployment URL
2. **Login page works:** You should see `/auth/login` for unauthenticated users
3. **No console errors:** Check browser developer console
4. **Function logs:** Check Cloudflare Pages → Deployments → Function Logs

## Key Takeaways

### ✅ DO

- Access `import.meta.env` inside request handlers (functions, API routes, middleware handlers)
- Initialize services with environment variables passed as parameters
- Set environment variables in Cloudflare Pages dashboard for runtime access

### ❌ DON'T

- Access `import.meta.env` at module level (outside functions)
- Use `process.env` in Cloudflare Workers (Node.js specific)
- Call validation functions at module initialization
- Use Node.js-specific libraries like Sharp in Workers runtime

## Related Documentation

- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Workers Runtime](https://developers.cloudflare.com/workers/runtime-apis/)

