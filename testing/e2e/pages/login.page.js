const { expect } = require("@playwright/test");

class LoginPage {
  constructor(page) {
    this.page = page;
    this.loginTab = page.locator(".tabs .tab-btn", { hasText: "Login" });
    this.registerTab = page.locator(".tabs .tab-btn", { hasText: "Register" });
    this.emailField = page.locator("#loginEmail");
    this.passwordField = page.locator("#loginPassword");
    this.submitButton = page.locator("#loginForm button[type='submit']");
    this.errorMessage = page.locator("#loginError");
    this.successMessage = page.locator("#loginSuccess");
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

  async login(email, password) {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.submitButton.click();
  }
}

module.exports = { LoginPage };