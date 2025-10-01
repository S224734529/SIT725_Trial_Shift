const { expect } = require("@playwright/test");

class ReviewRequestPage {
  constructor(page) {
    this.page = page;
    
    // Main elements
    this.headline = page.locator("h2", { hasText: "Profile Update Review Requests" });
    this.requestsList = page.locator("#requestsList");
    this.noRequestsMessage = page.locator("#requestsList p", { hasText: "No pending requests." });
    
    // Request card elements
    this.requestCards = page.locator(".request-card");
    this.userInfo = page.locator(".user-info");
    this.requestStatus = page.locator(".request-status");
    this.requestActions = page.locator(".request-actions");
    
    // Action buttons
    this.approveButtons = page.locator(".approve-btn");
    this.declineButtons = page.locator(".decline-btn");
    
    // Modals
    this.feedbackModal = page.locator("#feedbackModal");
    this.modalMessage = page.locator("#modalMessage");
    this.modalCloseBtn = page.locator("#feedbackModal .modal-close-btn");
    
    this.confirmModal = page.locator("#confirmModal");
    this.confirmMessage = page.locator("#confirmMessage");
    this.confirmYesBtn = page.locator("#confirmModal button", { hasText: "Yes" });
    this.confirmNoBtn = page.locator("#confirmModal button", { hasText: "No" });
    
    this.declineModal = page.locator("#declineModal");
    this.declineMessage = page.locator("#declineMessage");
    this.declineReasonInput = page.locator("#declineReasonInput");
    this.declineSubmitBtn = page.locator("#declineModal button", { hasText: "Decline" });
    this.declineCancelBtn = page.locator("#declineModal button", { hasText: "Cancel" });
  }

  async goto() {
    await this.page.goto("/review-request.html");
  }

  async expectLoaded() {
    await expect(this.page).toHaveTitle(/Profile Update Review Requests/i);
    await expect(this.headline).toBeVisible();
    await expect(this.requestsList).toBeVisible();
  }

  async waitForRequestsLoad() {
    await this.page.waitForTimeout(1000);
  }

  async getRequestCount() {
    return await this.requestCards.count();
  }

  async getRequestCardByIndex(index) {
    return this.requestCards.nth(index);
  }

  async getRequestCardById(id) {
    return this.page.locator(`#request-${id}`);
  }

  async approveRequestByIndex(index) {
    await this.approveButtons.nth(index).click();
  }

  async declineRequestByIndex(index) {
    await this.declineButtons.nth(index).click();
  }

  async approveRequestById(id) {
    await this.page.locator(`#request-${id} .approve-btn`).click();
  }

  async declineRequestById(id) {
    await this.page.locator(`#request-${id} .decline-btn`).click();
  }

  async confirmAction() {
    await this.confirmYesBtn.click();
  }

  async cancelAction() {
    await this.confirmNoBtn.click();
  }

  async enterDeclineReason(reason) {
    await this.declineReasonInput.fill(reason);
  }

  async submitDecline() {
    await this.declineSubmitBtn.click();
  }

  async cancelDecline() {
    await this.declineCancelBtn.click();
  }

  async closeModal() {
    await this.modalCloseBtn.click();
  }

  async getRequestDetails(index) {
    const card = this.requestCards.nth(index);
    return {
      userInfo: await card.locator(".user-info").textContent(),
      status: await card.locator(".request-status").textContent(),
      name: await card.locator("div:nth-child(3)").textContent(),
      state: await card.locator("div:nth-child(4)").textContent(),
      hasProfilePic: await card.locator("img").isVisible()
    };
  }
}

module.exports = { ReviewRequestPage };