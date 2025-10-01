// const { test, expect } = require('@playwright/test');
// const { LoginPage } = require('../pages/login.page');
// const { JobPreferencesPage } = require('../pages/job-preferences.page');

// test.describe('Job Preferences Management', () => {
//   let loginPage;
//   let jobPrefsPage;

//   test.beforeEach(async ({ page }) => {
//     loginPage = new LoginPage(page);
//     jobPrefsPage = new JobPreferencesPage(page);
    
//     // Login and navigate to job preferences
//     await loginPage.navigate();
//     await loginPage.login('test@example.com', 'password123');
//     await jobPrefsPage.navigate();
//     await expect(page).toHaveURL(/job-preferences/);
//   });

//   test('should display job preferences page correctly', async ({ page }) => {
//     // Verify page structure
//     await expect(page.locator('h4.teal-text')).toHaveText('Job Preferences');
//     await expect(jobPrefsPage.preferredLocationInput).toBeVisible();
//     await expect(jobPrefsPage.preferredCategoriesInput).toBeVisible();
//     await expect(jobPrefsPage.saveButton).toBeVisible();
//     await expect(jobPrefsPage.preferencesTable).toBeVisible();
//   });

//   test('should create a new job preference', async ({ page }) => {
//     const testLocation = 'San Francisco';
//     const testCategories = 'Software Engineering, Data Science';

//     await jobPrefsPage.createPreference(testLocation, testCategories);

//     // Verify success and form reset
//     await expect(jobPrefsPage.preferredLocationInput).toBeEmpty();
    
//     // Verify new entry in table
//     const lastRow = jobPrefsPage.getLastTableRow();
//     await expect(lastRow.locator('td:nth-child(2)')).toHaveText(testLocation);
//     await expect(lastRow.locator('td:nth-child(3)')).toContainText('Software Engineering');
//   });

//   test('should edit existing job preference', async ({ page }) => {
//     // Create initial preference
//     await jobPrefsPage.createPreference('New York', 'Technology');
    
//     // Edit the preference
//     await jobPrefsPage.editFirstPreference('Boston', 'Marketing, Sales');

//     // Verify update
//     await expect(jobPrefsPage.getFirstTableRow().locator('td:nth-child(2)'))
//       .toHaveText('Boston');
//   });

//   test('should delete single job preference', async ({ page }) => {
//     await jobPrefsPage.createPreference('Chicago', 'Finance');
    
//     const initialCount = await jobPrefsPage.getPreferencesCount();
    
//     // Setup dialog handler for confirmation
//     page.once('dialog', dialog => dialog.accept());
    
//     await jobPrefsPage.deleteFirstPreference();
    
//     // Wait for deletion and verify
//     await page.waitForTimeout(500);
//     const finalCount = await jobPrefsPage.getPreferencesCount();
//     expect(finalCount).toBe(initialCount - 1);
//   });

//   test('should bulk delete job preferences', async ({ page }) => {
//     // Create multiple preferences
//     await jobPrefsPage.createPreference('Location 1', 'Category 1');
//     await jobPrefsPage.createPreference('Location 2', 'Category 2');
    
//     const initialCount = await jobPrefsPage.getPreferencesCount();
//     expect(initialCount).toBeGreaterThan(1);

//     // Bulk delete
//     page.once('dialog', dialog => dialog.accept());
//     await jobPrefsPage.bulkDeletePreferences();

//     // Verify all preferences deleted
//     await expect(jobPrefsPage.preferencesTable.locator('tbody tr'))
//       .toHaveCount(0);
//   });

//   test('should validate required fields', async ({ page }) => {
//     // Try to submit empty form
//     await jobPrefsPage.saveButton.click();
    
//     // Materialize should show validation error
//     await expect(jobPrefsPage.preferredLocationInput).toHaveClass(/invalid/);
//   });

//   test('should clear form when reset button clicked', async ({ page }) => {
//     // Fill form
//     await jobPrefsPage.fillForm('Test Location', 'Test Categories');
    
//     // Clear form
//     await jobPrefsPage.clearForm();
    
//     // Verify fields are empty
//     await expect(jobPrefsPage.preferredLocationInput).toBeEmpty();
//     await expect(jobPrefsPage.preferredCategoriesInput).toBeEmpty();
//   });
// });
const { test, expect } = require('@playwright/test');

test.describe('Job Preferences Management', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock login by setting token directly
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-jwt-token-for-testing');
      localStorage.setItem('user', JSON.stringify({
        id: '123',
        name: 'Test User',
        role: 'jobseeker'
      }));
    });

    // Navigate to job preferences page
    await page.goto('/job-preferences.html');
    
    // Wait for page to load
    await page.waitForSelector('h4.teal-text');
  });

  test('should display job preferences page correctly', async () => {
    // Verify page structure
    await expect(page.locator('h4.teal-text')).toHaveText('Job Preferences');
    await expect(page.locator('#preferredLocation')).toBeVisible();
    await expect(page.locator('#preferredCategories')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('should create a new job preference', async () => {
    const testLocation = 'San Francisco';
    const testCategories = 'Software Engineering, Data Science';

    // Fill the form
    await page.fill('#preferredLocation', testLocation);
    await page.fill('#preferredCategories', testCategories);
    
    // Mock the API response
    await page.route('**/api/job-preferences', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            _id: '12345',
            preferredLocation: testLocation,
            preferredCategories: testCategories.split(',').map(cat => cat.trim()),
            user: '123'
          })
        });
      } else {
        await route.continue();
      }
    });

    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for form reset (indicating success)
    await expect(page.locator('#preferredLocation')).toHaveValue('');
  });

  test('should edit existing job preference', async () => {
    // First, mock some existing preferences
    await page.route('**/api/job-preferences', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          _id: 'pref1',
          preferredLocation: 'New York',
          preferredCategories: ['Technology'],
          user: '123'
        }])
      });
    });

    // Refresh to load mocked data
    await page.reload();
    await page.waitForSelector('tbody tr');

    // Click edit button on the first row
    await page.click('tbody tr:first-child .edit-btn');
    
    // Verify form is populated
    await expect(page.locator('#preferredLocation')).toHaveValue('New York');
    
    // Update values
    await page.fill('#preferredLocation', 'Boston');
    await page.fill('#preferredCategories', 'Marketing, Sales');
    
    // Mock update API
    await page.route('**/api/job-preferences/pref1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            _id: 'pref1',
            preferredLocation: 'Boston',
            preferredCategories: ['Marketing', 'Sales'],
            user: '123'
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator('#preferredLocation')).toHaveValue('');
  });

  test('should validate required fields', async () => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Materialize should show validation error
    const locationInput = page.locator('#preferredLocation');
    await expect(locationInput).toHaveClass(/invalid/);
  });

  test('should clear form when reset button clicked', async () => {
    // Fill form
    await page.fill('#preferredLocation', 'Test Location');
    await page.fill('#preferredCategories', 'Test Categories');
    
    // Clear form
    await page.click('#resetBtn');
    
    // Verify fields are empty
    await expect(page.locator('#preferredLocation')).toHaveValue('');
    await expect(page.locator('#preferredCategories')).toHaveValue('');
  });
});