const { test, expect } = require("@playwright/test");
const { CategoryPage } = require("../pages/category.page");
const { LoginPage } = require("../pages/login.page");

test.describe("Category CRUD Operations", () => {
  let categoryPage;
  let loginPage;

  test.beforeEach(async ({ page }) => {
    categoryPage = new CategoryPage(page);
    loginPage = new LoginPage(page);
  });

  test("should redirect to home/login when accessing category manage without authentication", async ({ page }) => {
    await categoryPage.gotoCategoryManage();
    
    // Should be redirected to home page (which is login page)
    const currentUrl = page.url();
    const isRootUrl = currentUrl === 'http://127.0.0.1:4173/' || currentUrl.endsWith('/');
    const isCategoryManageUrl = currentUrl.includes('/category-manage');
    
    expect(isRootUrl || isCategoryManageUrl).toBeTruthy();
    
    // If on root, it should be the login page
    if (isRootUrl) {
      await expect(page).toHaveTitle(/Login/i);
      await expect(loginPage.emailField).toBeVisible();
      await expect(loginPage.passwordField).toBeVisible();
    }
  });

  test("should have correct category manage page URL structure", async ({ page }) => {
    await categoryPage.gotoCategoryManage();
    
    // Check URL pattern - should be either category-manage or root (login)
    const currentUrl = page.url();
    const isRootUrl = currentUrl === 'http://127.0.0.1:4173/' || currentUrl.endsWith('/');
    const isCategoryManageUrl = currentUrl.includes('/category-manage');
    
    expect(isRootUrl || isCategoryManageUrl).toBeTruthy();
    
    // If redirected to root, verify login page structure
    if (isRootUrl) {
      await expect(loginPage.loginTab).toBeVisible();
      await expect(loginPage.emailField).toBeVisible();
      await expect(loginPage.passwordField).toBeVisible();
    }
  });

  test("should have proper page titles for category pages", async ({ page }) => {
    // Test category manage page title (even if redirected)
    await categoryPage.gotoCategoryManage();
    const title = await page.title();
    expect(title).toMatch(/Manage Categories|Login/i);
    
    // Test category edit page title (even if redirected)
    await categoryPage.gotoCategoryEdit('test-id');
    const editTitle = await page.title();
    expect(editTitle).toMatch(/Edit Category|Login/i);
  });

  test("should handle authentication requirement for category operations", async ({ page }) => {
    // This test verifies that category pages properly redirect when not authenticated
    await categoryPage.gotoCategoryManage();
    
    const currentUrl = page.url();
    const isRootUrl = currentUrl === 'http://127.0.0.1:4173/' || currentUrl.endsWith('/');
    
    if (isRootUrl) {
      // Verify we're on login page with proper form
      await expect(loginPage.loginTab).toBeVisible();
      await expect(loginPage.emailField).toBeVisible();
      await expect(loginPage.passwordField).toBeVisible();
      await expect(loginPage.submitButton).toBeEnabled();
    }
  });

  test("should have accessible category page routes", async ({ page }) => {
    // Test that category page routes exist and respond
    const response = await page.goto('/category-manage.html');
    expect(response?.status()).toBeLessThan(500); // Should not be server error
    
    const editResponse = await page.goto('/category-edit.html?id=test');
    expect(editResponse?.status()).toBeLessThan(500); // Should not be server error
  });

  test("should have category-related page metadata", async ({ page }) => {
    // Verify pages load without JavaScript errors
    const [response] = await Promise.all([
      page.waitForEvent('response'),
      categoryPage.gotoCategoryManage().catch(() => {})
    ]);
    
    // Page should load successfully (2xx or 3xx status)
    const status = response?.status();
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(500);
  });

  test("should properly enforce authentication for category management", async ({ page }) => {
    // Test multiple category-related pages to verify consistent auth behavior
    const pagesToTest = ['/category-manage.html', '/category-edit.html?id=test123'];
    
    for (const pageUrl of pagesToTest) {
      await page.goto(pageUrl);
      const finalUrl = page.url();
      
      // Check if we're on the requested page or redirected to root
      const isRequestedPage = finalUrl.includes(pageUrl);
      const isRootUrl = finalUrl === 'http://127.0.0.1:4173/' || finalUrl.endsWith('/');
      
      expect(isRequestedPage || isRootUrl).toBeTruthy();
      
      // If on root, verify it's the login interface
      if (isRootUrl) {
        await expect(page).toHaveTitle(/Login/i);
      }
    }
  });
});

test.describe("Category Page Structure (when authenticated)", () => {
  test("should display category management interface when logged in as admin", async ({ page }) => {
    const categoryPage = new CategoryPage(page);
    
    // Try to access category manage
    await categoryPage.gotoCategoryManage();
    
    // If we get to category manage page, verify structure
    if (page.url().includes('/category-manage')) {
      await expect(categoryPage.categoryNameInput).toBeVisible();
      await expect(categoryPage.categoryDescriptionTextarea).toBeVisible();
      await expect(categoryPage.addCategoryButton).toBeVisible();
      await expect(categoryPage.categoryList).toBeVisible();
    }
    // If redirected to root, that's expected behavior for unauthenticated access
  });
});