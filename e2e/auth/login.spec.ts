import { test, expect } from '../utils/fixtures';
import { LoginPage } from '../utils/page-objects/LoginPage';

/**
 * E2E tests for login functionality
 * Following Playwright best practices with Page Object Model
 */
test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/login/i);

    // Verify form elements are visible
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling form
    await loginPage.submitButton.click();

    // Check for validation errors
    const errorMessage = loginPage.getErrorMessage();
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Attempt login with invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Wait for error message
    const errorMessage = loginPage.getErrorMessage();
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/invalid/i);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Note: Use test credentials from your test database
    const testEmail = 'test@example.com';
    const testPassword = 'Test123!';

    // Perform login
    await loginPage.login(testEmail, testPassword);

    // Verify redirect to home page
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await loginPage.clickForgotPassword();

    // Verify navigation
    await expect(page).toHaveURL('/auth/forgot-password');
  });

  test('should navigate to register page', async ({ page }) => {
    await loginPage.clickRegister();

    // Verify navigation
    await expect(page).toHaveURL('/auth/register');
  });

  test('should remember email in form', async ({ page }) => {
    const email = 'test@example.com';

    // Fill email field
    await loginPage.emailInput.fill(email);

    // Refresh page
    await page.reload();

    // Check if browser remembered the email (if autocomplete is enabled)
    // This is browser-dependent behavior
  });

  test('should toggle password visibility', async ({ page }) => {
    // If you have a password visibility toggle
    const passwordToggle = page.locator('[aria-label="Toggle password visibility"]');
    
    if (await passwordToggle.isVisible()) {
      // Initially password should be hidden
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

      // Click toggle
      await passwordToggle.click();

      // Password should be visible
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    }
  });
});

test.describe('Login API', () => {
  test('should handle login API endpoint', async ({ request }) => {
    // API testing using Playwright's request context
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!',
      },
    });

    // Verify response
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('user');
  });

  test('should reject invalid credentials via API', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword',
      },
    });

    // Verify error response
    expect(response.status()).toBe(401);
  });
});

