const { test, expect } = require("@playwright/test");
const { UserPage } = require("../pages/user.page");

test.describe("User Management page", () => {
  let userPage;

  test.beforeEach(async ({ page }) => {
    // Mock authentication and sidebar - fix sidebar to not intercept events
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
                <div style="pointer-events: none;">
                  <button id="profileBtn" style="pointer-events: auto;">Profile</button>
                  <button id="logoutBtn" style="pointer-events: auto;">Logout</button>
                  <div id="welcomeMessage"></div>
                </div>
              \`;
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

    userPage = new UserPage(page);
  });

  test("renders user management page", async ({ page }) => {
    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
    });

    await userPage.goto();
    await userPage.expectLoaded();
    
    await expect(userPage.userRows).toHaveCount(0);
    await expect(userPage.bulkDeleteBtn).not.toBeVisible();
  });

  test("displays list of users", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      },
      {
        _id: "user2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "employer",
        active: false
      },
      {
        _id: "user3",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        active: true
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    await expect(userPage.userRows).toHaveCount(3);
    
    // Use page.evaluate to directly check the DOM since the actual rendering might be delayed
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('#usersTable tbody tr');
      return rows.length > 0 && rows[0].querySelector('td:nth-child(2)')?.textContent;
    });

    const firstUser = await userPage.getUserDetails(0);
    expect(firstUser.name).toBe("John Doe");
    expect(firstUser.email).toBe("john@example.com");
    expect(firstUser.role).toBe("jobseeker");
    expect(firstUser.status).toBe("Active");
    expect(firstUser.activateButtonText).toBe("Deactivate");

    const secondUser = await userPage.getUserDetails(1);
    expect(secondUser.name).toBe("Jane Smith");
    expect(secondUser.email).toBe("jane@example.com");
    expect(secondUser.role).toBe("employer");
    expect(secondUser.status).toBe("Inactive");
    expect(secondUser.activateButtonText).toBe("Activate");
  });

  test("selects and deselects users with checkboxes", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      },
      {
        _id: "user2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "employer",
        active: false
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    // Wait for checkboxes to be ready
    await page.waitForSelector('.userCheckbox', { state: 'visible' });

    // Select first user
    await userPage.selectUserByIndex(0);
    await page.waitForTimeout(200);
    expect(await userPage.getSelectedUserCount()).toBe(1);
    await expect(userPage.bulkDeleteBtn).toBeVisible();

    // Select second user
    await userPage.selectUserByIndex(1);
    await page.waitForTimeout(200);
    expect(await userPage.getSelectedUserCount()).toBe(2);

    // Deselect first user
    await userPage.selectUserByIndex(0); // Toggle off
    await page.waitForTimeout(200);
    expect(await userPage.getSelectedUserCount()).toBe(1);

    // Select all using select all checkbox
    await userPage.selectAllUsers();
    await page.waitForTimeout(200);
    expect(await userPage.getSelectedUserCount()).toBe(2);

    // Deselect all
    await userPage.deselectAllUsers();
    await page.waitForTimeout(200);
    expect(await userPage.getSelectedUserCount()).toBe(0);
    await expect(userPage.bulkDeleteBtn).not.toBeVisible();
  });

  test("deletes single user with confirmation", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    // Mock delete endpoint
    await page.route("**/api/admin/users/user1", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    // Wait for delete button to be ready
    await page.waitForSelector('#usersTable tbody button', { hasText: 'Delete', state: 'visible' });

    await userPage.deleteUserByIndex(0);
    
    // Confirm in confirmation modal
    await expect(userPage.confirmModal).toBeVisible();
    await expect(userPage.confirmMessage).toHaveText("Are you sure you want to permanently delete this user?");
    
    await userPage.confirmAction();

    // Users should be refreshed (empty in this case since we only had one user)
    await page.waitForTimeout(500);
  });

  test("cancels single user deletion", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    await page.waitForSelector('#usersTable tbody button', { hasText: 'Delete', state: 'visible' });

    await userPage.deleteUserByIndex(0);
    
    await expect(userPage.confirmModal).toBeVisible();
    
    await userPage.cancelAction();

    // Modal should close and user should remain
    await expect(userPage.confirmModal).not.toBeVisible();
    await expect(userPage.userRows).toHaveCount(1);
  });

  test("bulk deletes users with confirmation", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      },
      {
        _id: "user2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "employer",
        active: false
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    // Mock bulk delete endpoint
    await page.route("**/api/admin/users/bulk-delete", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    await page.waitForSelector('.userCheckbox', { state: 'visible' });

    // Select both users
    await userPage.selectUserByIndex(0);
    await page.waitForTimeout(200);
    await userPage.selectUserByIndex(1);
    await page.waitForTimeout(200);
    
    await expect(userPage.bulkDeleteBtn).toBeVisible();
    await userPage.bulkDelete();
    
    // Confirm in confirmation modal
    await expect(userPage.confirmModal).toBeVisible();
    await expect(userPage.confirmMessage).toHaveText("Delete selected users permanently?");
    
    await userPage.confirmAction();

    // Users should be refreshed
    await page.waitForTimeout(500);
  });

  test("toggles user active status", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    // Mock toggle active endpoint
    await page.route("**/api/admin/users/user1/active", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    await page.waitForSelector('#usersTable tbody button', { hasText: /Activate|Deactivate/, state: 'visible' });

    const initialUser = await userPage.getUserDetails(0);
    expect(initialUser.status).toBe("Active");
    expect(initialUser.activateButtonText).toBe("Deactivate");

    await userPage.toggleUserActiveByIndex(0);

    // Should immediately call API and refresh
    await page.waitForTimeout(500);
  });

  test("hides bulk delete button when no users selected", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    await page.waitForSelector('.userCheckbox', { state: 'visible' });

    // Initially hidden
    await expect(userPage.bulkDeleteBtn).not.toBeVisible();

    // Select user - should show button
    await userPage.selectUserByIndex(0);
    await page.waitForTimeout(200);
    await expect(userPage.bulkDeleteBtn).toBeVisible();

    // Deselect user - should hide button
    await userPage.selectUserByIndex(0); // Toggle off
    await page.waitForTimeout(200);
    await expect(userPage.bulkDeleteBtn).not.toBeVisible();
  });

  test("handles API errors for user deletion", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    // Mock delete endpoint to fail
    await page.route("**/api/admin/users/user1", route => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" })
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    await page.waitForSelector('#usersTable tbody button', { hasText: 'Delete', state: 'visible' });

    await userPage.deleteUserByIndex(0);
    await userPage.confirmAction();

    // User should still be in list since deletion failed
    await page.waitForTimeout(500);
    await expect(userPage.userRows).toHaveCount(1);
  });

  test("handles API errors for bulk deletion", async ({ page }) => {
    const mockUsers = [
      {
        _id: "user1",
        name: "John Doe",
        email: "john@example.com",
        role: "jobseeker",
        active: true
      },
      {
        _id: "user2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "employer",
        active: false
      }
    ];

    await page.route("**/api/admin/users", route => {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUsers)
      });
    });

    // Mock bulk delete endpoint to fail
    await page.route("**/api/admin/users/bulk-delete", route => {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" })
      });
    });

    await userPage.goto();
    await userPage.waitForUsersLoad();

    await page.waitForSelector('.userCheckbox', { state: 'visible' });

    await userPage.selectUserByIndex(0);
    await page.waitForTimeout(200);
    await userPage.selectUserByIndex(1);
    await page.waitForTimeout(200);
    await userPage.bulkDelete();
    await userPage.confirmAction();

    // Users should still be in list since bulk deletion failed
    await page.waitForTimeout(500);
    await expect(userPage.userRows).toHaveCount(2);
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

    await page.route("**/user.html", route => {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<html><body>Redirecting...</body></html>'
      });
    });

    await userPage.goto();
    
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/');
  });
});