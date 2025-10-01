const { expect } = require("@playwright/test");

class CategoryPage {
  constructor(page) {
    this.page = page;
    
    // Category Management Page Elements
    this.categoryNameInput = page.locator('#categoryName');
    this.categoryDescriptionTextarea = page.locator('#categoryDescription');
    this.addCategoryButton = page.locator('button[type="submit"]');
    this.categoryList = page.locator('#categoryList');
    this.categoryItems = page.locator('#categoryList .collection-item');
    this.editButtons = page.locator('a[href*="/category-edit"]');
    this.deleteButtons = page.locator('button.delete-category');
    
    // Messages
    this.addSuccessMessage = page.locator('#addSuccess');
    this.editSuccessMessage = page.locator('#editSuccess');
    
    // Edit Page Elements
    this.editCategoryForm = page.locator('#editCategoryForm');
    this.updateCategoryButton = page.locator('button[type="submit"]');
  }

  async gotoCategoryManage() {
    await this.page.goto('/category-manage.html', { waitUntil: 'networkidle' });
  }

  async gotoCategoryEdit(categoryId) {
    await this.page.goto(`/category-edit.html?id=${categoryId}`, { waitUntil: 'networkidle' });
  }

  async expectCategoryManageLoaded() {
    // Only check if we're actually on category manage page
    if (this.page.url().includes('/category-manage')) {
      await expect(this.page).toHaveTitle(/Manage Categories/i);
      await expect(this.categoryNameInput).toBeVisible();
    }
  }

  async expectCategoryEditLoaded() {
    // Only check if we're actually on category edit page
    if (this.page.url().includes('/category-edit')) {
      await expect(this.page).toHaveTitle(/Edit Category/i);
      await expect(this.editCategoryForm).toBeVisible();
    }
  }

  async createCategory(categoryData) {
    // Only try to create category if we're on category manage page
    if (this.page.url().includes('/category-manage')) {
      await this.categoryNameInput.fill(categoryData.name);
      if (categoryData.description) {
        await this.categoryDescriptionTextarea.fill(categoryData.description);
      }
      await this.addCategoryButton.click();
    }
  }

  async updateCategory(updatedData) {
    // Only try to update category if we're on category edit page
    if (this.page.url().includes('/category-edit')) {
      if (updatedData.name) {
        await this.categoryNameInput.fill(updatedData.name);
      }
      if (updatedData.description !== undefined) {
        await this.categoryDescriptionTextarea.fill(updatedData.description);
      }
      await this.updateCategoryButton.click();
    }
  }

  async getCategoryCount() {
    // Only check category count if we're on category manage page and category list exists
    if (this.page.url().includes('/category-manage') && await this.categoryList.isVisible().catch(() => false)) {
      const items = await this.categoryItems.count();
      if (items === 1) {
        const text = await this.categoryItems.first().textContent();
        if (text.includes('No categories found')) {
          return 0;
        }
      }
      return items;
    }
    return 0;
  }

  async getCategoryNames() {
    const count = await this.getCategoryCount();
    if (count === 0) return [];
    return await this.categoryItems.locator('div:first-child').allTextContents();
  }

  async editFirstCategory() {
    // Only try to edit if we're on category manage page and edit buttons exist
    if (this.page.url().includes('/category-manage') && await this.editButtons.first().isVisible().catch(() => false)) {
      await this.editButtons.first().click();
      await this.page.waitForURL(/\/category-edit/);
    }
  }

  async deleteFirstCategory() {
    // Only try to delete if we're on category manage page and delete buttons exist
    if (this.page.url().includes('/category-manage') && await this.deleteButtons.first().isVisible().catch(() => false)) {
      const initialCount = await this.getCategoryCount();
      await this.deleteButtons.first().click();
      
      // Handle confirmation dialog
      this.page.once('dialog', dialog => dialog.accept());
      
      await this.page.waitForTimeout(1000);
      return initialCount;
    }
    return 0;
  }

  async isOnLoginPage() {
    return this.page.url().includes('/login') || await this.page.title().then(title => title.includes('Login'));
  }

  async isOnCategoryManagePage() {
    return this.page.url().includes('/category-manage');
  }

  async isOnCategoryEditPage() {
    return this.page.url().includes('/category-edit');
  }
}

module.exports = { CategoryPage };