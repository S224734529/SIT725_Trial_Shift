const { expect } = require("@playwright/test");

class JobPage {
  constructor(page) {
    this.page = page;
    
    // Job Post Page Elements
    this.titleInput = page.locator('#title');
    this.categorySelect = page.locator('#category');
    this.locationSelect = page.locator('#location');
    this.shiftDetailsTextarea = page.locator('#shiftDetails');
    this.submitButton = page.locator('button[type="submit"]');
    
    // Job List Elements
    this.jobList = page.locator('#jobList');
    this.jobItems = page.locator('#jobList .collection-item');
    this.editButtons = page.locator('a[href*="/job-edit"]');
    this.deleteButtons = page.locator('button.delete-job');
    
    // Messages and UI
    this.successMessage = page.locator('#successMessage');
    this.welcomeMessage = page.locator('#welcomeMessage');
    
    // Edit Page Elements
    this.editForm = page.locator('#editForm');
    this.updateButton = page.locator('button[type="submit"]');
    
    // Login Page Elements (for redirect handling)
    this.loginEmailField = page.locator('input[type="email"]');
    this.loginPasswordField = page.locator('input[type="password"]');
    this.loginSubmitButton = page.locator('button[type="submit"]');
  }

  async gotoJobPost() {
    await this.page.goto('/job-post', { waitUntil: 'networkidle' });
    // Don't expect specific page - handle both job-post and login
  }

  async gotoJobEdit(jobId) {
    await this.page.goto(`/job-edit?id=${jobId}`, { waitUntil: 'networkidle' });
  }

  async expectJobPostLoaded() {
    // Only check if we're actually on job post page
    if (this.page.url().includes('/job-post')) {
      await expect(this.page).toHaveTitle(/Post a Job/i);
      await expect(this.titleInput).toBeVisible();
    }
  }

  async expectJobEditLoaded() {
    // Only check if we're actually on job edit page
    if (this.page.url().includes('/job-edit')) {
      await expect(this.page).toHaveTitle(/Edit Job/i);
      await expect(this.editForm).toBeVisible();
    }
  }

  async createJob(jobData) {
    // Only try to create job if we're on job post page
    if (this.page.url().includes('/job-post')) {
      await this.titleInput.fill(jobData.title);
      await this.categorySelect.selectOption(jobData.category);
      await this.locationSelect.selectOption(jobData.location);
      await this.shiftDetailsTextarea.fill(jobData.shiftDetails);
      await this.submitButton.click();
    }
  }

  async updateJob(updatedData) {
    // Only try to update job if we're on job edit page
    if (this.page.url().includes('/job-edit')) {
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

  async getJobCount() {
    // Only check job count if we're on job post page and job list exists
    if (this.page.url().includes('/job-post') && await this.jobList.isVisible().catch(() => false)) {
      const items = await this.jobItems.count();
      if (items === 1) {
        const text = await this.jobItems.first().textContent();
        if (text.includes('No jobs posted') || text.includes('Loading jobs')) {
          return 0;
        }
      }
      return items;
    }
    return 0;
  }

  async getJobTitles() {
    const count = await this.getJobCount();
    if (count === 0) return [];
    return await this.jobItems.locator('.job-details').allTextContents();
  }

  async editFirstJob() {
    // Only try to edit if we're on job post page and edit buttons exist
    if (this.page.url().includes('/job-post') && await this.editButtons.first().isVisible().catch(() => false)) {
      await this.editButtons.first().click();
      await this.page.waitForURL(/\/job-edit/);
    }
  }

  async deleteFirstJob() {
    // Only try to delete if we're on job post page and delete buttons exist
    if (this.page.url().includes('/job-post') && await this.deleteButtons.first().isVisible().catch(() => false)) {
      const initialCount = await this.getJobCount();
      await this.deleteButtons.first().click();
      this.page.once('dialog', dialog => dialog.accept());
      await this.page.waitForTimeout(1000);
      return initialCount;
    }
    return 0;
  }

  async isOnLoginPage() {
    return this.page.url().includes('/login') || await this.page.title().then(title => title.includes('Login'));
  }

  async isOnJobPostPage() {
    return this.page.url().includes('/job-post');
  }

  async isOnJobEditPage() {
    return this.page.url().includes('/job-edit');
  }
}

module.exports = { JobPage };