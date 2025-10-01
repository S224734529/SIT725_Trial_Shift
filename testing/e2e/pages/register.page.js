const { expect } = require("@playwright/test");

class RegisterPage {
  constructor(page) {
    this.page = page;
    this.nameField = page.locator("#registerName");
    this.emailField = page.locator("#registerEmail");
    this.passwordField = page.locator("#registerPassword");
    this.confirmField = page.locator("#registerConfirm");
    this.stateSelect = page.locator("#registerState");
    this.roleEmployer = page.locator('input[name="role"][value="employer"]');
    this.roleJobSeeker = page.locator('input[name="role"][value="jobseeker"]');
    this.submitButton = page.locator("#registerForm button[type='submit']");
    this.errorMessage = page.locator("#registerError");
  }

  async switchTo() {
    await this.page.locator(".tabs .tab-btn", { hasText: "Register" }).click();
    await expect(this.nameField).toBeVisible();
  }

  async register({ name, email, password, confirm, state, role }) {
    await this.nameField.fill(name);
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.confirmField.fill(confirm);
    await this.stateSelect.selectOption(state);
    if (role === "employer") {
      await this.roleEmployer.check();
    } else {
      await this.roleJobSeeker.check();
    }
    await this.submitButton.click();
  }
}

module.exports = { RegisterPage };
