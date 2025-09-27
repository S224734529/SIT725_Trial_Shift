const { test } = require("@playwright/test");
const { LoginPage } = require("../pages/login.page");

test.describe("Login page", () => {
  test("renders the login form", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectLoaded();
  });
});
