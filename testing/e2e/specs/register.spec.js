const { test, expect } = require("@playwright/test");
const { LoginPage } = require("../pages/login.page");
const { RegisterPage } = require("../pages/register.page");

test.describe("Register page", () => {
  let registerPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    registerPage = new RegisterPage(page);
    await registerPage.switchTo();
  });

  test("requires name", async () => {
    await registerPage.register({
      name: "",
      email: "test@test.com",
      password: "123456",
      confirm: "123456",
      state: "Victoria",
      role: "employer"
    });
    await expect(registerPage.errorMessage).toHaveText("Please enter your name.");
  });

  test("invalid email format", async () => {
    await registerPage.register({
      name: "Test User",
      email: "bad-email",
      password: "123456",
      confirm: "123456",
      state: "Victoria",
      role: "employer"
    });
    await expect(registerPage.errorMessage).toHaveText("Please enter a valid email address.");
  });

  test("short password", async () => {
    await registerPage.register({
      name: "Test User",
      email: "test@test.com",
      password: "123",
      confirm: "123",
      state: "Victoria",
      role: "employer"
    });
    await expect(registerPage.errorMessage).toHaveText("Password must be at least 6 characters.");
  });

  test("password mismatch", async () => {
    await registerPage.register({
      name: "Test User",
      email: "test@test.com",
      password: "123456",
      confirm: "654321",
      state: "Victoria",
      role: "employer"
    });
    await expect(registerPage.errorMessage).toHaveText("Passwords do not match!");
  });

  test("state required", async () => {
    await registerPage.register({
      name: "Test User",
      email: "test@test.com",
      password: "123456",
      confirm: "123456",
      state: "",
      role: "employer"
    });
    await expect(registerPage.errorMessage).toHaveText("Please select your state.");
  });

  test("successful registration switches to login", async ({ page }) => {
    await page.route("**/api/users/register", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "ok" })
      })
    );

    await registerPage.register({
      name: "Test User",
      email: "test@test.com",
      password: "123456",
      confirm: "123456",
      state: "Victoria",
      role: "employer"
    });

    await expect(page.locator("#loginSuccess")).toHaveText(
      "Registration successful! Please login."
    );
  });

  test("registration failure", async ({ page }) => {
    await page.route("**/api/users/register", route =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email already exists" })
      })
    );

    await registerPage.register({
      name: "Test User",
      email: "duplicate@test.com",
      password: "123456",
      confirm: "123456",
      state: "Victoria",
      role: "jobseeker"
    });

    await expect(registerPage.errorMessage).toHaveText("Email already exists");
  });
});
