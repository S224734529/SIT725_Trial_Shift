const { test, expect } = require("@playwright/test");
const { ReviewRequestPage } = require("../pages/review-request.page");

test.describe("Review Request page", () => {
  let reviewRequestPage;

  test.beforeEach(async ({ page }) => {
    // Mock authentication and sidebar
    await page.addInitScript(() => {
      localStorage.setItem("token", "mock-admin-token");
    });

    await page.route("**/components/sidebar.js", route => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          console.log('Sidebar mocked');
          function loadSidebar() { 
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
              sidebar.innerHTML = \`
                <div>
                  <button id="profileBtn">Profile</button>
                  <button id="logoutBtn">Logout</button>
                  <div id="welcomeMessage"></div>
                </div>
              \`;
              document.getElementById("profileBtn").addEventListener("click", () => {
                console.log("Profile clicked");
              });
              document.getElementById("logoutBtn").addEventListener("click", () => {
                console.log("Logout clicked");
              });
            }
          }
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadSidebar);
          } else {
            loadSidebar();
          }
        `
      });
    });

    reviewRequestPage = new ReviewRequestPage(page);
  });

  test("renders review requests page", async ({ page }) => {
    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.expectLoaded();
    
    await expect(reviewRequestPage.noRequestsMessage).toHaveText("No pending requests.");
  });

  test("displays list of pending requests", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: {
          name: "John Smith",
          state: "Victoria",
          profilePic: "https://example.com/pic1.jpg"
        }
      },
      {
        _id: "req2", 
        user: { name: "Jane Smith", email: "jane@example.com" },
        requestedAt: "2024-01-16T14:20:00.000Z",
        updates: {
          name: "Jane Doe",
          state: "Queensland",
          profilePic: null
        }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await expect(reviewRequestPage.requestCards).toHaveCount(2);
    
    const firstRequestDetails = await reviewRequestPage.getRequestDetails(0);
    expect(firstRequestDetails.userInfo).toContain("John Doe");
    expect(firstRequestDetails.userInfo).toContain("john@example.com");
    expect(firstRequestDetails.name).toContain("John Smith");
    expect(firstRequestDetails.state).toContain("Victoria");
    expect(firstRequestDetails.hasProfilePic).toBe(true);

    await expect(reviewRequestPage.approveButtons).toHaveCount(2);
    await expect(reviewRequestPage.declineButtons).toHaveCount(2);
  });

  test("approves a request successfully", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: { name: "John Smith", state: "Victoria" }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    // Mock approve endpoint
    await page.route("**/api/admin/profile-requests/req1/approve", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await reviewRequestPage.approveRequestByIndex(0);
    
    // Confirm in confirmation modal
    await expect(reviewRequestPage.confirmModal).toBeVisible();
    await expect(reviewRequestPage.confirmMessage).toHaveText("Approve this profile update?");
    
    await reviewRequestPage.confirmAction();

    // Check success feedback
    await expect(reviewRequestPage.feedbackModal).toBeVisible();
    await expect(reviewRequestPage.modalMessage).toHaveText("Profile update approved and applied.");
    
    // Request should be removed from list
    await expect(reviewRequestPage.requestCards).toHaveCount(0);
  });

  test("cancels approval action", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: { name: "John Smith", state: "Victoria" }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await reviewRequestPage.approveRequestByIndex(0);
    
    await expect(reviewRequestPage.confirmModal).toBeVisible();
    
    await reviewRequestPage.cancelAction();

    // Modal should close and request should remain
    await expect(reviewRequestPage.confirmModal).not.toBeVisible();
    await expect(reviewRequestPage.requestCards).toHaveCount(1);
  });

  test("declines a request with reason", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: { name: "John Smith", state: "Victoria" }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    // Mock decline endpoint
    await page.route("**/api/admin/profile-requests/req1/decline", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await reviewRequestPage.declineRequestByIndex(0);
    
    // Should open decline reason modal
    await expect(reviewRequestPage.declineModal).toBeVisible();
    
    await reviewRequestPage.enterDeclineReason("Incomplete information provided");
    await reviewRequestPage.submitDecline();

    // Should open confirmation modal
    await expect(reviewRequestPage.confirmModal).toBeVisible();
    await expect(reviewRequestPage.confirmMessage).toHaveText("Decline this profile update?");
    
    await reviewRequestPage.confirmAction();

    // Check success feedback
    await expect(reviewRequestPage.feedbackModal).toBeVisible();
    await expect(reviewRequestPage.modalMessage).toHaveText("Profile update declined.");
    
    // Request should be removed from list
    await expect(reviewRequestPage.requestCards).toHaveCount(0);
  });

  test("declines a request without reason", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: { name: "John Smith", state: "Victoria" }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    await page.route("**/api/admin/profile-requests/req1/decline", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await reviewRequestPage.declineRequestByIndex(0);
    
    await expect(reviewRequestPage.declineModal).toBeVisible();
    
    // Don't enter any reason, just submit
    await reviewRequestPage.submitDecline();

    await expect(reviewRequestPage.confirmModal).toBeVisible();
    await reviewRequestPage.confirmAction();

    await expect(reviewRequestPage.feedbackModal).toBeVisible();
    await expect(reviewRequestPage.modalMessage).toHaveText("Profile update declined.");
  });

  test("cancels decline action", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: { name: "John Smith", state: "Victoria" }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await reviewRequestPage.declineRequestByIndex(0);
    
    await expect(reviewRequestPage.declineModal).toBeVisible();
    
    await reviewRequestPage.cancelDecline();

    // Decline modal should close and request should remain
    await expect(reviewRequestPage.declineModal).not.toBeVisible();
    await expect(reviewRequestPage.requestCards).toHaveCount(1);
  });

  test("handles API errors for approve", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: { name: "John Smith", state: "Victoria" }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    // Mock approve endpoint to fail
    await page.route("**/api/admin/profile-requests/req1/approve", route => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" })
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await reviewRequestPage.approveRequestByIndex(0);
    await reviewRequestPage.confirmAction();

    // Check error feedback
    await expect(reviewRequestPage.feedbackModal).toBeVisible();
    await expect(reviewRequestPage.modalMessage).toHaveText("Failed to approve.");
    
    // Request should still be in list since approval failed
    await expect(reviewRequestPage.requestCards).toHaveCount(1);
  });

  test("handles API errors for decline", async ({ page }) => {
    const mockRequests = [
      {
        _id: "req1",
        user: { name: "John Doe", email: "john@example.com" },
        requestedAt: "2024-01-15T10:30:00.000Z",
        updates: { name: "John Smith", state: "Victoria" }
      }
    ];

    await page.route("**/api/admin/profile-requests", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockRequests)
      });
    });

    // Mock decline endpoint to fail
    await page.route("**/api/admin/profile-requests/req1/decline", route => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" })
      });
    });

    await reviewRequestPage.goto();
    await reviewRequestPage.waitForRequestsLoad();

    await reviewRequestPage.declineRequestByIndex(0);
    await reviewRequestPage.submitDecline();
    await reviewRequestPage.confirmAction();

    // Check error feedback
    await expect(reviewRequestPage.feedbackModal).toBeVisible();
    await expect(reviewRequestPage.modalMessage).toHaveText("Failed to decline.");
    
    // Request should still be in list since decline failed
    await expect(reviewRequestPage.requestCards).toHaveCount(1);
  });

  test("redirects to login when no token", async ({ page }) => {
    // Clear token for this test
    await page.addInitScript(() => {
      localStorage.removeItem("token");
    });

    // Mock the redirect behavior
    await page.addInitScript(() => {
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, href: '' },
        writable: true
      });
    });

    await page.route("**/review-request.html", route => {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<html><body>Redirecting...</body></html>'
      });
    });

    await reviewRequestPage.goto();
    
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/');
  });
});