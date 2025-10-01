class JobPreferencesPage {
  constructor(page) {
    this.page = page;
    
    // Form elements
    this.preferredLocationInput = page.locator('#preferredLocation');
    this.preferredCategoriesInput = page.locator('#preferredCategories');
    this.saveButton = page.locator('#prefForm button[type="submit"]');
    this.resetButton = page.locator('#resetBtn');
    this.prefIdHidden = page.locator('#prefId');
    
    // Table elements
    this.preferencesTable = page.locator('table');
    this.tableBody = page.locator('#prefsBody');
    this.tableRows = this.tableBody.locator('tr');
    
    // Bulk actions
    this.selectAllCheckbox = page.locator('#selectAll');
    this.bulkDeleteButton = page.locator('#bulkDeleteBtn');
    
    // Action buttons
    this.editButtons = page.locator('.edit-btn');
    this.deleteButtons = page.locator('.delete-btn');
  }

  async navigate() {
    await this.page.goto('/job-preferences.html');
  }

  async fillForm(location, categories = '') {
    await this.preferredLocationInput.fill(location);
    if (categories) {
      await this.preferredCategoriesInput.fill(categories);
    }
  }

  async createPreference(location, categories = '') {
    await this.fillForm(location, categories);
    await this.saveButton.click();
    await this.page.waitForTimeout(1000); // Wait for API call
  }

  async editFirstPreference(newLocation, newCategories = '') {
    // Click edit on first row
    await this.editButtons.first().click();
    
    // Update form
    await this.fillForm(newLocation, newCategories);
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  async deleteFirstPreference() {
    await this.deleteButtons.first().click();
  }

  async bulkDeletePreferences() {
    await this.selectAllCheckbox.check();
    await this.bulkDeleteButton.click();
  }

  async clearForm() {
    await this.resetButton.click();
  }

  getFirstTableRow() {
    return this.tableRows.first();
  }

  getLastTableRow() {
    return this.tableRows.last();
  }

  async getPreferencesCount() {
    return await this.tableRows.count();
  }

  async isEditMode() {
    const hiddenValue = await this.prefIdHidden.inputValue();
    return hiddenValue !== '';
  }
}

module.exports = { JobPreferencesPage };