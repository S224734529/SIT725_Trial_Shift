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

  async loginWithCredentials(credentials, options = {}) {
    if (!credentials?.email) {
      throw new Error("loginWithCredentials requires an email");
    }

    if (typeof credentials.password === "undefined") {
      throw new Error("loginWithCredentials requires a password");
    }

    await this.emailField.fill(credentials.email);
    await this.passwordField.fill(credentials.password);

    const waitForUrl = options.waitForUrl;
    const waitForLoadState = options.waitForLoadState ?? "networkidle";
    const timeout = options.timeout ?? 10000;

    const waiters = [];

    if (waitForUrl) {
      waiters.push(this.page.waitForURL(waitForUrl, { timeout }));
    } else if (waitForLoadState) {
      waiters.push(this.page.waitForLoadState(waitForLoadState, { timeout }));
    }

    await Promise.all([this.submitButton.click(), ...waiters]);
  }

  async waitForNavigation(urlPattern = "**/*", options = {}) {
    const timeout = options.timeout ?? 10000;
    const state = options.waitForLoadState ?? "networkidle";

    if (urlPattern && urlPattern !== "**/*") {
      await this.page.waitForURL(urlPattern, { timeout });
      return;
    }

    await this.page.waitForLoadState(state, { timeout });
  }
}

module.exports = { LoginPage };
