import type { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Login Page
 * Example implementation following POM pattern
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]');
    this.registerLink = page.locator('a[href="/auth/register"]');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto("/auth/login");
  }

  /**
   * Perform login action
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click register link
   */
  async clickRegister() {
    await this.registerLink.click();
  }

  /**
   * Get error message element (from react-hook-form validation or toast)
   * FormMessage elements don't have role="alert" by default, so we use a more flexible selector
   */
  getErrorMessage() {
    // Try to find form validation errors first (p tags with error styling)
    // or toast notifications
    return this.page.locator('[role="status"]').first();
  }

  /**
   * Get form field error for specific field
   */
  getFieldError(fieldName: string) {
    // FormMessage has data-slot="form-message" attribute and is within the FormItem
    // We need to find the FormItem containing the field, then find the form-message within it
    return this.page.locator(`[name="${fieldName}"]`).locator("..").locator('[data-slot="form-message"]');
  }

  /**
   * Get any form validation error messages
   */
  getAnyFieldError() {
    return this.page.locator('[data-slot="form-message"]').first();
  }
}
