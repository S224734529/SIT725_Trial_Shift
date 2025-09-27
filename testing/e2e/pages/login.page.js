const { expect } = require("@playwright/test");

class LoginPage {
  constructor(page) {
    this.page = page;
    this.loginTab = page.locator(".tabs .tab-btn", { hasText: "Login" });
    this.emailField = page.locator("#loginForm input[type='email']");
    this.passwordField = page.locator("#loginForm input[type='password']");
    this.submitButton = page.locator("#loginForm button[type='submit']");
  }

  async goto() {
    await this.page.goto("/");
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/Login/i);
    await expect(this.loginTab).toBeVisible();
    await expect(this.emailField).toBeVisible();
    await expect(this.passwordField).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }
}

module.exports = { LoginPage };
