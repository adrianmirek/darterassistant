# Testing Documentation

This project uses a comprehensive testing suite including unit tests, component tests, API tests, and end-to-end tests.

## Tech Stack

- **Vitest** - Fast unit test framework for unit and integration tests
- **React Testing Library** - Component testing with user-centric approach
- **Playwright** - End-to-end testing with Chromium
- **Supertest** - API endpoint testing (optional)

## Getting Started

### Install Dependencies

All testing dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Running Tests

#### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

#### E2E Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run e2e tests with UI mode
npm run test:e2e:ui

# Run e2e tests in debug mode
npm run test:e2e:debug

# Generate e2e test code
npm run test:e2e:codegen

# Show test report
npm run test:e2e:report
```

## Project Structure

```
darterassistant/
├── src/
│   ├── test/
│   │   ├── setup.ts              # Vitest global setup
│   │   └── utils/
│   │       ├── test-utils.tsx    # Custom render function with providers
│   │       └── mock-factories.ts # Mock factories for common objects
│   ├── components/
│   │   └── ui/
│   │       └── button.test.tsx   # Example component test
│   ├── lib/
│   │   └── services/
│   │       └── auth.service.test.ts # Example service test
│   └── pages/
│       └── api/
│           └── auth/
│               └── login.test.ts # Example API test
├── e2e/
│   ├── utils/
│   │   ├── fixtures.ts           # Playwright custom fixtures
│   │   └── page-objects/
│   │       ├── BasePage.ts       # Base page object class
│   │       └── LoginPage.ts      # Example page object
│   ├── auth/
│   │   └── login.spec.ts         # Example auth e2e test
│   └── home.spec.ts              # Example home page e2e test
├── vitest.config.ts              # Vitest configuration
└── playwright.config.ts          # Playwright configuration
```

## Writing Tests

### Unit Tests (Vitest)

Unit tests should be placed next to the file they're testing with `.test.ts` or `.spec.ts` extension.

#### Example Component Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### Example Service Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/utils/mock-factories';

vi.mock('@/db/supabase.client', () => ({
  createClient: vi.fn(),
}));

describe('MyService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  it('should fetch data', async () => {
    mockSupabase.from().select.mockResolvedValue({
      data: [{ id: 1, name: 'Test' }],
      error: null,
    });

    // Test your service
  });
});
```

### E2E Tests (Playwright)

E2E tests should be placed in the `e2e/` directory.

#### Example E2E Test with Page Object Model

```typescript
import { test, expect } from './utils/fixtures';
import { LoginPage } from './utils/page-objects/LoginPage';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login successfully', async ({ page }) => {
    await loginPage.login('user@example.com', 'password');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

#### Example API Test

```typescript
test('should call API endpoint', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'user@example.com',
      password: 'password',
    },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveProperty('user');
});
```

## Best Practices

### Unit Testing

1. **Use descriptive test names** - Test names should clearly describe what they're testing
2. **Follow AAA pattern** - Arrange, Act, Assert
3. **Mock external dependencies** - Use `vi.mock()` and `vi.fn()`
4. **Test user behavior** - Use React Testing Library's user-centric queries
5. **Keep tests isolated** - Each test should be independent
6. **Use factories for test data** - Create reusable mock factories

### E2E Testing

1. **Use Page Object Model** - Encapsulate page interactions in page objects
2. **Use semantic locators** - Prefer role-based and text-based locators
3. **Wait for elements properly** - Use Playwright's auto-waiting features
4. **Isolate tests** - Use browser contexts for isolation
5. **Use fixtures** - Create reusable test fixtures
6. **Take screenshots on failure** - Already configured in playwright.config.ts
7. **Use trace viewer** - Debug failing tests with trace viewer

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Coverage

Coverage reports are generated in the `coverage/` directory when running:

```bash
npm run test:coverage
```

Current coverage thresholds:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## Debugging

### Vitest UI Mode

Run tests with UI for better debugging experience:

```bash
npm run test:ui
```

### Playwright Debug Mode

Debug e2e tests step by step:

```bash
npm run test:e2e:debug
```

### Playwright Trace Viewer

View traces of test runs:

```bash
npx playwright show-trace trace.zip
```

## Tips

1. **Watch mode for development** - Use `npm run test:watch` during development
2. **Filter tests** - Use `-t "test name"` to run specific tests
3. **Update snapshots** - Use `-u` flag to update snapshots
4. **Generate e2e tests** - Use `npm run test:e2e:codegen` to record interactions
5. **Visual regression** - Use `expect(page).toHaveScreenshot()` for visual testing
6. **Parallel execution** - E2E tests run in parallel by default for faster execution

## Troubleshooting

### Vitest Issues

- **Tests not found**: Check your test file patterns in `vitest.config.ts`
- **Module resolution errors**: Verify path aliases in `vitest.config.ts`
- **DOM not available**: Ensure `environment: 'jsdom'` is set

### Playwright Issues

- **Browser not found**: Run `npx playwright install chromium`
- **Port already in use**: Change port in `playwright.config.ts`
- **Timeout errors**: Increase timeout in test or config
- **Flaky tests**: Use `test.retry()` or improve waits

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

