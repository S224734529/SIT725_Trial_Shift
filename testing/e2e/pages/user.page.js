const { expect } = require("@playwright/test");

class UserPage {
  constructor(page) {
    this.page = page;
    
    // Main elements
    this.headline = page.locator("h2", { hasText: "User Management" });
    this.welcomeMessage = page.locator("#welcomeMessage");
    this.usersTable = page.locator("#usersTable");
    this.tableBody = page.locator("#usersTable tbody");
    
    // Buttons
    this.bulkDeleteBtn = page.locator("#bulkDeleteBtn");
    this.selectAllCheckbox = page.locator("#selectAll");
    
    // Table elements
    this.userRows = page.locator("#usersTable tbody tr");
    this.userCheckboxes = page.locator("#usersTable tbody .userCheckbox");
    this.checkedCheckboxes = page.locator("#usersTable tbody .userCheckbox:checked");
    
    // Action buttons in table
    this.deleteButtons = page.locator("#usersTable tbody button", { hasText: "Delete" });
    this.activateDeactivateButtons = page.locator("#usersTable tbody button", { hasText: /Activate|Deactivate/ });
    
    // Modal elements
    this.confirmModal = page.locator("#confirmModal");
    this.confirmMessage = page.locator("#confirmMessage");
    this.confirmYesBtn = page.locator("#confirmModal button", { hasText: "Yes" });
    this.confirmNoBtn = page.locator("#confirmModal button", { hasText: "No" });
  }

  async goto() {
    await this.page.goto("/user.html");
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/User Page/i);
    await expect(this.headline).toBeVisible();
    await expect(this.usersTable).toBeVisible();
  }

  async waitForUsersLoad() {
    // Wait for table to be populated with actual content
    await this.page.waitForFunction(() => {
      const tbody = document.querySelector('#usersTable tbody');
      const rows = tbody?.querySelectorAll('tr');
      return rows && rows.length > 0 && rows[0].querySelector('td:nth-child(2)')?.textContent?.trim();
    }, { timeout: 10000 });
    
    await this.page.waitForTimeout(1000);
  }

  async getUserCount() {
    return await this.userRows.count();
  }

  async selectUserByIndex(index) {
    // Use JavaScript to click and trigger the change event
    await this.page.evaluate((index) => {
      const checkboxes = document.querySelectorAll('#usersTable tbody .userCheckbox');
      if (checkboxes[index]) {
        checkboxes[index].click();
        checkboxes[index].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, index);
    await this.page.waitForTimeout(300);
  }

  async selectUserById(id) {
    await this.page.evaluate((id) => {
      const checkbox = document.querySelector(`.userCheckbox[value="${id}"]`);
      if (checkbox) {
        checkbox.click();
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, id);
    await this.page.waitForTimeout(300);
  }

  async selectAllUsers() {
    await this.page.evaluate(() => {
      const selectAll = document.querySelector('#selectAll');
      if (selectAll) {
        selectAll.click();
        selectAll.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await this.page.waitForTimeout(300);
  }

  async deselectAllUsers() {
    await this.page.evaluate(() => {
      const selectAll = document.querySelector('#selectAll');
      if (selectAll) {
        selectAll.checked = false;
        selectAll.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await this.page.waitForTimeout(300);
  }

  async getSelectedUserCount() {
    return await this.checkedCheckboxes.count();
  }

  async deleteUserByIndex(index) {
    await this.page.evaluate((index) => {
      const deleteButtons = document.querySelectorAll('#usersTable tbody button');
      const deleteBtn = Array.from(deleteButtons).find(btn => btn.textContent === 'Delete');
      if (deleteBtn) {
        deleteBtn.click();
      }
    }, index);
    await this.page.waitForTimeout(300);
  }

  async deleteUserById(id) {
    await this.page.evaluate((id) => {
      const row = document.querySelector(`tr:has(.userCheckbox[value="${id}"])`);
      const deleteBtn = row?.querySelector('button');
      if (deleteBtn && deleteBtn.textContent === 'Delete') {
        deleteBtn.click();
      }
    }, id);
    await this.page.waitForTimeout(300);
  }

  async toggleUserActiveByIndex(index) {
    await this.page.evaluate((index) => {
      const buttons = document.querySelectorAll('#usersTable tbody button');
      const toggleBtn = Array.from(buttons).find(btn => 
        btn.textContent === 'Activate' || btn.textContent === 'Deactivate'
      );
      if (toggleBtn) {
        toggleBtn.click();
      }
    }, index);
    await this.page.waitForTimeout(300);
  }

  async bulkDelete() {
    // Use JavaScript to click the button directly
    await this.page.evaluate(() => {
      const bulkDeleteBtn = document.querySelector('#bulkDeleteBtn');
      if (bulkDeleteBtn) {
        bulkDeleteBtn.click();
      }
    });
    await this.page.waitForTimeout(300);
  }

  async confirmAction() {
    await this.page.evaluate(() => {
      const yesBtn = document.querySelector('#confirmModal button');
      if (yesBtn && yesBtn.textContent === 'Yes') {
        yesBtn.click();
      }
    });
    await this.page.waitForTimeout(300);
  }

  async cancelAction() {
    await this.page.evaluate(() => {
      const noBtn = Array.from(document.querySelectorAll('#confirmModal button'))
        .find(btn => btn.textContent === 'No');
      if (noBtn) {
        noBtn.click();
      }
    });
    await this.page.waitForTimeout(300);
  }

  async getUserDetails(index) {
    const row = this.userRows.nth(index);
    return {
      name: await row.locator("td:nth-child(2)").textContent(),
      email: await row.locator("td:nth-child(3)").textContent(),
      role: await row.locator("td:nth-child(4)").textContent(),
      status: await row.locator("td:nth-child(5)").textContent(),
      isChecked: await row.locator(".userCheckbox").isChecked(),
      activateButtonText: await row.locator("button", { hasText: /Activate|Deactivate/ }).textContent()
    };
  }

  async isBulkDeleteVisible() {
    // Check both CSS display and visibility
    const isVisible = await this.bulkDeleteBtn.isVisible();
    if (!isVisible) return false;
    
    // Also check the computed style
    const display = await this.bulkDeleteBtn.evaluate(el => {
      return window.getComputedStyle(el).display;
    });
    return display !== 'none';
  }

  // Helper to manually set the bulk delete button visibility for testing
  async setBulkDeleteVisibility(visible) {
    await this.page.evaluate((visible) => {
      const btn = document.querySelector('#bulkDeleteBtn');
      if (btn) {
        btn.style.display = visible ? 'inline-block' : 'none';
      }
    }, visible);
  }

  // Helper to manually check checkboxes for testing
  async setCheckboxState(index, checked) {
    await this.page.evaluate((index, checked) => {
      const checkboxes = document.querySelectorAll('#usersTable tbody .userCheckbox');
      if (checkboxes[index]) {
        checkboxes[index].checked = checked;
        checkboxes[index].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, index, checked);
  }
}

module.exports = { UserPage };