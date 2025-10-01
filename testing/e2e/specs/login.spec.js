const { test, expect } = require("@playwright/test");
const { LoginPage } = require("../pages/login.page");

test.describe("Login page", () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectLoaded();
  });

  test("renders login form", async () => {
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test("shows error for invalid email", async () => {
    await loginPage.login("bad-email", "password123");
    await expect(loginPage.errorMessage).toHaveText("Please enter a valid email address.");
  });

  test("shows error when password is missing", async () => {
    await loginPage.login("user@example.com", "");
    await expect(loginPage.errorMessage).toHaveText("Please enter your password.");
  });

  test("login failure from API", async ({ page }) => {
    await page.route("**/api/users/login", route =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid credentials" })
      })
    );
    await loginPage.login("user@example.com", "wrongpass");
    await expect(loginPage.errorMessage).toHaveText("Invalid credentials");
  });

  test("login success and redirect", async ({ page }) => {
    await page.route("**/api/users/login", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "abc123",
          user: { active: true }
        })
      })
    );
    const [redirect] = await Promise.all([
      page.waitForNavigation(),
      loginPage.login("user@example.com", "password123")
    ]);
    expect(redirect.url()).toContain("/dashboard.html");
  });

  test("shows inactive user message", async ({ page }) => {
    await page.route("**/api/users/login", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "abc123",
          user: { active: false }
        })
      })
    );
    await loginPage.login("inactive@example.com", "password123");
    await expect(loginPage.errorMessage).toHaveText(
      "Your account is inactive. Please contact admin for assistance."
    );
  });
});