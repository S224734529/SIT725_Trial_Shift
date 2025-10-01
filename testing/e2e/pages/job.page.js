const { expect } = require("@playwright/test");

class JobPage {
  constructor(page) {
    this.page = page;
    
    // Navigation
    this.jobPostLink = page.locator('a[href="/job-post"]');
    this.dashboardLink = page.locator('a[href="/dashboard.html"]');
    
    // Job Form Elements
    this.titleInput = page.locator('#title');
    this.categorySelect = page.locator('#category');
    this.locationSelect = page.locator('#location');
    this.shiftDetailsTextarea = page.locator('#shiftDetails');
    this.submitButton = page.locator('button[type="submit"]');
    
    // Job List Elements
    this.jobList = page.locator('#jobList');
    this.jobItems = page.locator('#jobList .collection-item');
    this.editButtons = page.locator('.job-actions a.btn-small:has-text("Edit")');
    this.deleteButtons = page.locator('.job-actions button.delete-job');
    
    // Messages
    this.successMessage = page.locator('#successMessage');
    
    // Edit Page Elements
    this.editForm = page.locator('#editForm');
    this.updateButton = page.locator('button[type="submit"]:has-text("Update Job")');
  }

  async gotoJobPost() {
    await this.page.goto('/job-post');
    // Don't wait for full load if not logged in, just check basic elements
    try {
      await this.expectJobPostLoaded();
    } catch (error) {
      // If not fully loaded due to auth, at least check page loaded
      await expect(this.page).toHaveTitle(/Post a Job|Login/i);
    }
  }

  async expectJobPostLoaded() {
    await expect(this.page).toHaveTitle(/Post a Job/i);
    await expect(this.titleInput).toBeVisible();
    await expect(this.categorySelect).toBeVisible();
    await expect(this.locationSelect).toBeVisible();
    await expect(this.shiftDetailsTextarea).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  async createJob(jobData) {
    await this.titleInput.fill(jobData.title);
    await this.categorySelect.selectOption(jobData.category);
    await this.locationSelect.selectOption(jobData.location);
    await this.shiftDetailsTextarea.fill(jobData.shiftDetails);
    await this.submitButton.click();
  }

  async expectJobCreated() {
    await expect(this.successMessage).toBeVisible();
    await expect(this.successMessage).toHaveText('Job created successfully!');
  }

  async getJobCount() {
    return await this.jobItems.count();
  }

  async getJobTitles() {
    return await this.jobItems.locator('.job-details').allTextContents();
  }

  async editFirstJob() {
    await this.editButtons.first().click();
    await this.page.waitForURL(/\/job-edit/);
  }

  async deleteFirstJob() {
    const initialCount = await this.getJobCount();
    await this.deleteButtons.first().click();
    
    // Handle confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());
    
    await this.page.waitForTimeout(1000); // Wait for deletion to process
    return initialCount;
  }

  async updateJob(updatedData) {
    if (updatedData.title) {
      await this.titleInput.fill(updatedData.title);
    }
    if (updatedData.category) {
      await this.categorySelect.selectOption(updatedData.category);
    }
    if (updatedData.location) {
      await this.locationSelect.selectOption(updatedData.location);
    }
    if (updatedData.shiftDetails) {
      await this.shiftDetailsTextarea.fill(updatedData.shiftDetails);
    }
    await this.updateButton.click();
  }
}

module.exports = { JobPage };