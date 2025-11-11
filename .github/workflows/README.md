# GitHub Actions CI/CD Pipeline

This directory contains the CI/CD workflow configuration for the Darter Assistant project.

## Workflow: `ci-cd.yml`

A minimal CI/CD pipeline that ensures code quality and successful builds.

### Triggers

The workflow runs automatically on:
- **Push to main branch** - Every time code is pushed to the main branch
- **Manual dispatch** - Can be triggered manually from the GitHub Actions tab

### Pipeline Jobs

The workflow consists of two jobs that run sequentially:

#### Job 1: Lint & Test
1. **Checkout code** - Gets the latest code from the repository
2. **Setup Node.js** - Installs Node.js from `.nvmrc` (22.14.0) with npm cache
3. **Install dependencies** - Runs `npm ci` for clean install
4. **Run linter** - Runs ESLint to check code quality
5. **Run unit tests** - Runs Vitest unit and integration tests

#### Job 2: Build Production (depends on Job 1)
1. **Checkout code** - Gets the latest code from the repository
2. **Setup Node.js** - Installs Node.js from `.nvmrc` (22.14.0) with npm cache
3. **Install dependencies** - Runs `npm ci` for clean install
4. **Build** - Creates production build with Astro
5. **Upload artifacts** - Saves the `dist/` folder

**Note:** The build job only runs if the test job succeeds.

### Artifacts

The workflow uploads the following artifacts:
- **Production build** - The `dist/` folder after successful build (7-day retention)

## Required GitHub Secrets

**Note:** This workflow currently does not require any GitHub secrets. The pipeline runs linting, unit tests, and builds the production version.

If you plan to add E2E tests or deployment steps in the future, you may need to configure secrets at that time.

## Running Workflow Manually

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select **CI/CD Pipeline** from the left sidebar
4. Click **Run workflow** button on the right
5. Select the branch (usually `main`)
6. Click **Run workflow**

## Viewing Workflow Results

### Success
When all tests pass and build succeeds, you'll see a ✅ green checkmark on the workflow run.

### Failure
If any step fails:
- Check the workflow logs for detailed error messages
- Download the Playwright report artifact if E2E tests failed
- Review linter errors or test failures
- Fix the issues and push again

### Artifacts
To download artifacts:
1. Go to the workflow run details
2. Scroll to the **Artifacts** section at the bottom
3. Click on the artifact name to download

## Workflow Features

### Job Dependencies
The workflow uses two separate jobs with a dependency chain:
- **Test Job** runs first with linting and unit tests
- **Build Job** only runs if the test job succeeds (using `needs: [test]`)
- This provides faster feedback - if tests fail, the build job is skipped

### Concurrency Control
The workflow uses concurrency groups to cancel in-progress runs when new commits are pushed to the same branch. This saves CI/CD minutes and provides faster feedback.

### Caching
Node.js setup includes npm cache to speed up dependency installation on subsequent runs. Each job benefits from caching independently.

### Node.js Version Management
The workflow reads the Node.js version from `.nvmrc` file, ensuring consistency between local development and CI/CD environments.

## Customization

### Adding More Node.js Versions
To test against multiple Node.js versions, modify the matrix strategy:

```yaml
strategy:
  matrix:
    node-version: [20.x, 22.x, 24.x]
```

### Adding E2E Tests
To add E2E tests back to the pipeline:

1. Add the E2E test steps to the workflow:
   ```yaml
   - name: Install Playwright browsers
     run: npx playwright install --with-deps chromium
   
   - name: Run E2E tests
     run: npm run test:e2e
     env:
       SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
       SUPABASE_PUBLIC_KEY: ${{ secrets.SUPABASE_PUBLIC_KEY }}
       E2E_USERNAME_ID: ${{ secrets.E2E_USERNAME_ID }}
       E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
       E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
       BASE_URL: http://localhost:3000
   ```

2. Configure the required GitHub secrets (see [`ENV_SETUP_E2E.md`](../../ENV_SETUP_E2E.md))

### Changing Trigger Branches
To run on different branches, modify the `on.push.branches` section:

```yaml
on:
  push:
    branches: [main, develop, staging]
```

### Adding Coverage Reports
To upload test coverage:

1. Add step after unit tests:
   ```yaml
   - name: Run unit tests with coverage
     run: npm run test:coverage

   - name: Upload coverage reports
     uses: actions/upload-artifact@v4
     with:
       name: coverage
       path: coverage/
   ```

## Troubleshooting

### ❌ Linting Fails
**Solution:** Run `npm run lint:fix` locally to fix auto-fixable issues, then commit the changes.

### ❌ Unit Tests Fail
**Solution:** Run `npm test` locally to debug failing tests. Fix the issues and commit the changes.

### ❌ Build Fails with "Out of Memory"
**Solution:** Add Node.js memory configuration:
```yaml
- name: Build production
  run: NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### ❌ Tests Timeout
**Solution:** Increase timeout in test configs or workflow:
```yaml
- name: Run E2E tests
  run: npm run test:e2e
  timeout-minutes: 15
```

## Monitoring

### Status Badge
Add a status badge to your README.md:

```markdown
[![CI/CD Pipeline](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci-cd.yml)
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repository name.

## Next Steps

After setting up the workflow:

1. ✅ Configure all required GitHub secrets
2. ✅ Push to main branch or trigger workflow manually
3. ✅ Verify all steps pass successfully
4. ✅ Add status badge to README.md
5. ✅ Consider setting up branch protection rules
6. ✅ Plan deployment workflow (optional)

## Future Enhancements

Consider adding:
- **Code coverage reporting** (Codecov, Coveralls)
- **Security scanning** (OWASP ZAP, Snyk)
- **Accessibility testing** (axe DevTools)
- **Performance testing** (Lighthouse CI)
- **Deployment automation** (to DigitalOcean)
- **Slack/Discord notifications**
- **Dependabot integration**

---

For more information about the testing setup, refer to:
- [`TESTING.md`](../../TESTING.md) - Overall testing documentation
- [`ENV_SETUP_E2E.md`](../../ENV_SETUP_E2E.md) - E2E environment setup guide
- [`E2E_TEARDOWN_SETUP.md`](../../E2E_TEARDOWN_SETUP.md) - E2E cleanup documentation

