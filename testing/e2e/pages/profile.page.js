const { expect } = require("@playwright/test");

class ProfilePage {
  constructor(page) {
    this.page = page;
    
    // Main elements
    this.headline = page.locator(".headline", { hasText: "User Profile" });
    this.successMessage = page.locator("#msgOk");
    this.errorMessage = page.locator("#msgErr");
    
    // Form fields
    this.nameField = page.locator("#name");
    this.emailField = page.locator("#email");
    this.stateDropdown = page.locator("#state");
    this.roleField = page.locator("#role");
    this.saveButton = page.locator("#saveProfileBtn");
    
    // Profile picture elements
    this.profilePictureSection = page.locator("#profilePictureSection");
    this.profilePreview = page.locator("#profilePreview");
    this.profilePicInput = page.locator("#profilePic");
    this.deletePicButton = page.locator("#deletePicBtn");
    
    // Banners
    this.pendingBanner = page.locator("#pendingBanner");
    this.declinedBanner = page.locator("#declinedBanner");
    this.declinedReason = page.locator("#declinedReason");
    
    // Form
    this.profileForm = page.locator("#profileForm");
  }

  async goto() {
    await this.page.goto("/profile.html");
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/User Profile/i);
    await expect(this.headline).toBeVisible();
    await expect(this.nameField).toBeVisible();
    await expect(this.emailField).toBeVisible();
    await expect(this.stateDropdown).toBeVisible();
    await expect(this.roleField).toBeVisible();
  }

  async waitForProfileLoad() {
    // Wait for any of the form fields to be populated
    await Promise.race([
      this.nameField.waitFor({ state: 'visible', timeout: 10000 }),
      this.emailField.waitFor({ state: 'visible', timeout: 10000 }),
      this.page.waitForTimeout(2000) // Fallback timeout
    ]);
    
    // Additional wait to ensure data is loaded
    await this.page.waitForTimeout(1000);
  }

  async fillProfileForm(name, state) {
    if (name) {
      await this.nameField.fill(name);
    }
    if (state) {
      await this.stateDropdown.selectOption(state);
    }
  }

  async saveProfile() {
    await this.saveButton.click();
  }

  async uploadProfilePicture() {
    // Create test assets directory and file
    const fs = require('fs');
    const path = require('path');
    const testAssetsDir = path.join(process.cwd(), 'test-assets');
    
    if (!fs.existsSync(testAssetsDir)) {
      fs.mkdirSync(testAssetsDir, { recursive: true });
    }
    
    const testImagePath = path.join(testAssetsDir, 'test-profile-pic.jpg');
    
    // Create a minimal valid JPEG file
    if (!fs.existsSync(testImagePath)) {
      // This is a valid 1x1 pixel JPEG
      const jpegBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        'base64'
      );
      fs.writeFileSync(testImagePath, jpegBuffer);
    }
    
    await this.profilePicInput.setInputFiles(testImagePath);
  }

  async deleteProfilePicture() {
    await this.deletePicButton.click();
  }

  async getFormValues() {
    return {
      name: await this.nameField.inputValue(),
      email: await this.emailField.inputValue(),
      state: await this.stateDropdown.inputValue(),
      role: await this.roleField.inputValue()
    };
  }
}

module.exports = { ProfilePage };