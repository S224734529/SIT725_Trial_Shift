const { expect } = require("@playwright/test");

class LoginPage {
  constructor(page) {
    this.page = page;
    this.loginTab = page.getByRole("button", { name: "Login" });
    this.emailField = page.getByPlaceholder("Enter your email");
    this.passwordField = page.getByPlaceholder("Enter your password");
    this.submitButton = page.getByRole("button", { name: "Login" });
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
