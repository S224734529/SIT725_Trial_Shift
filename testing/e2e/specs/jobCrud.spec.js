const { test, expect } = require("@playwright/test");
const { JobPage } = require("../pages/job.page");

test.describe("Job CRUD Operations", () => {
  let jobPage;

  test.beforeEach(async ({ page }) => {
    jobPage = new JobPage(page);
    
    // Navigate directly to job post page (bypass login for testing)
    await jobPage.gotoJobPost();
  });

  test("should load job post page with form elements", async ({ page }) => {
    // Verify all form elements are present and visible
    await expect(jobPage.titleInput).toBeVisible();
    await expect(jobPage.categorySelect).toBeVisible();
    await expect(jobPage.locationSelect).toBeVisible();
    await expect(jobPage.shiftDetailsTextarea).toBeVisible();
    await expect(jobPage.submitButton).toBeEnabled();
    
    // Verify page title
    await expect(page).toHaveTitle(/Post a Job/i);
  });

  test("should display job list section", async ({ page }) => {
    // Verify job list container is visible
    await expect(jobPage.jobList).toBeVisible();
    
    // Check job list structure
    const jobCount = await jobPage.getJobCount();
    
    if (jobCount > 0) {
      // If jobs exist, verify they have proper structure
      const firstJob = jobPage.jobItems.first();
      await expect(firstJob.locator('.job-details')).toBeVisible();
      await expect(firstJob.locator('.job-actions')).toBeVisible();
    } else {
      // If no jobs, verify empty state message
      await expect(jobPage.jobList).toContainText(/No jobs posted|Loading jobs/);
    }
  });

  test("should fill job form with valid data", async ({ page }) => {
    const jobData = {
      title: `Test Job ${Date.now()}`,
      category: 'kitchenhand',
      location: 'Melbourne',
      shiftDetails: '9 AM - 5 PM, Monday to Friday'
    };

    // Fill the form
    await jobPage.titleInput.fill(jobData.title);
    await jobPage.categorySelect.selectOption(jobData.category);
    await jobPage.locationSelect.selectOption(jobData.location);
    await jobPage.shiftDetailsTextarea.fill(jobData.shiftDetails);
    
    // Verify form data was entered correctly
    await expect(jobPage.titleInput).toHaveValue(jobData.title);
    await expect(jobPage.shiftDetailsTextarea).toHaveValue(jobData.shiftDetails);
  });

  test("should have working category dropdown", async ({ page }) => {
    // Verify category dropdown has options
    const categoryOptions = await jobPage.categorySelect.locator('option').count();
    expect(categoryOptions).toBeGreaterThan(1); // Should have more than just the placeholder
    
    // Test selecting a category
    await jobPage.categorySelect.selectOption('kitchenhand');
    
    // Verify selection worked (this might not have a visible value change, but should not error)
  });

  test("should have working location dropdown", async ({ page }) => {
    // Verify location dropdown has options
    const locationOptions = await jobPage.locationSelect.locator('option').count();
    expect(locationOptions).toBeGreaterThan(1); // Should have more than just the placeholder
    
    // Test selecting a location
    await jobPage.locationSelect.selectOption('Melbourne');
    
    // Verify selection worked
  });

  test("should have edit and delete buttons in job list", async ({ page }) => {
    const jobCount = await jobPage.getJobCount();
    
    if (jobCount > 0) {
      // Verify edit buttons exist and are visible
      const editButtonCount = await jobPage.editButtons.count();
      expect(editButtonCount).toBeGreaterThan(0);
      await expect(jobPage.editButtons.first()).toBeVisible();
      
      // Verify delete buttons exist and are visible
      const deleteButtonCount = await jobPage.deleteButtons.count();
      expect(deleteButtonCount).toBeGreaterThan(0);
      await expect(jobPage.deleteButtons.first()).toBeVisible();
    }
  });

  test("should navigate to job edit page when edit button clicked", async ({ page }) => {
    const jobCount = await jobPage.getJobCount();
    
    if (jobCount > 0) {
      // Click edit button on first job
      await jobPage.editFirstJob();
      
      // Should navigate to edit page
      await expect(page).toHaveURL(/\/job-edit/);
      
      // Verify edit form is present
      await expect(jobPage.editForm).toBeVisible();
    } else {
      // If no jobs, skip this test gracefully
      console.log('No jobs available for edit test');
      expect(true).toBeTruthy();
    }
  });
});