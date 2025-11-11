# CI/CD Setup Checklist

Quick reference guide for setting up the GitHub Actions CI/CD pipeline.

## ✅ Pre-Setup (Local)

Before configuring GitHub Actions, ensure your local environment works:

- [ ] Unit tests pass: `npm test -- --run`
- [ ] Production build works: `npm run build`
- [ ] Linting passes: `npm run lint`

> **Tip:** If any of these fail locally, fix them before setting up CI/CD.

## 🔐 GitHub Secrets Configuration

**Note:** The current workflow does not require any GitHub secrets.

The pipeline runs:
- ✅ Linting (ESLint)
- ✅ Unit tests (Vitest)
- ✅ Production build (Astro)

**If you plan to add E2E tests later**, you'll need to configure the following secrets:
- `SUPABASE_URL`
- `SUPABASE_PUBLIC_KEY`
- `E2E_USERNAME_ID`
- `E2E_USERNAME`
- `E2E_PASSWORD`

See [`.github/workflows/README.md`](workflows/README.md) for instructions on adding E2E tests.

## 🚀 Workflow Activation

The workflow is automatically active once the file is committed to the repository.

- [ ] Commit and push `.github/workflows/ci-cd.yml` to main branch
- [ ] Go to GitHub repository → Actions tab
- [ ] Verify "CI/CD Pipeline" workflow appears in the list

## 🧪 Test the Workflow

### Option A: Manual Trigger (Recommended First)

1. [ ] Go to Actions tab
2. [ ] Click "CI/CD Pipeline" in the left sidebar
3. [ ] Click "Run workflow" button
4. [ ] Select branch: `main`
5. [ ] Click "Run workflow"
6. [ ] Wait for completion and check all steps pass ✅

### Option B: Push to Main

1. [ ] Make a small change (e.g., update README.md)
2. [ ] Commit and push to main branch
3. [ ] Go to Actions tab
4. [ ] Watch workflow run automatically

## ✅ Verify Success

After workflow completes:

- [ ] All jobs show green checkmarks ✅
- [ ] **Test job** passed (linting + unit tests)
- [ ] **Build job** passed (production build)
- [ ] Build artifact uploaded (check Artifacts section)

## 🐛 Troubleshooting

### If Workflow Fails

1. **Check the logs**
   - Click on the failed workflow run
   - Click on the failed step
   - Read error messages

2. **Common Issues**

   | Error | Solution |
   |-------|----------|
   | "Cannot find module" | Clear cache and re-run |
   | Linting errors | Run `npm run lint:fix` locally |
   | Unit tests fail | Run `npm test` locally to debug |
   | Build fails | Check for TypeScript errors locally |

3. **Fix Issues Locally**
   - Run the failing step locally to reproduce the issue
   - Fix the problem and commit the changes
   - Push again to re-run the workflow

## 🎯 Optional Enhancements

Once basic workflow is running:

### Add Status Badge

- [ ] Add badge to README.md:
  ```markdown
  [![CI/CD Pipeline](https://github.com/USERNAME/REPO/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/ci-cd.yml)
  ```

### Set Branch Protection

- [ ] Go to Settings → Branches → Add rule
- [ ] Branch name pattern: `main`
- [ ] Enable: "Require status checks to pass before merging"
- [ ] Select: "Test & Build" check
- [ ] Enable: "Require branches to be up to date before merging"

### Enable Notifications

- [ ] Go to Settings → Notifications
- [ ] Configure email/Slack/Discord notifications for workflow failures

## 📋 Reference Documents

For detailed information, refer to:

- [`.github/workflows/README.md`](./workflows/README.md) - Workflow documentation
- [`ENV_SETUP_E2E.md`](../ENV_SETUP_E2E.md) - E2E environment setup
- [`E2E_TEARDOWN_SETUP.md`](../E2E_TEARDOWN_SETUP.md) - E2E cleanup details
- [`TESTING.md`](../TESTING.md) - Overall testing guide

## ✨ You're Done!

Once all checkboxes are complete, your CI/CD pipeline is fully configured and operational!

🎉 Congratulations! Every push to main will now automatically test and build your application.

---

**Last Updated:** November 2025

