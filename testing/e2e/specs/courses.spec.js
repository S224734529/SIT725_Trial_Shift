const { test, expect } = require("@playwright/test");
const { CoursesPage } = require("../pages/courses.page");
const { LoginPage } = require("../pages/login.page");
const courseData = require("../../test-data/course-data");

test.describe("Course Management E2E Tests", () => {
  let loginPage;
  let coursesPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    coursesPage = new CoursesPage(page);
    
    // Login as admin using course management credentials
    await coursesPage.loginAsAdmin(loginPage);
  });

  test.describe("Manage Courses Page - Listing and Filtering", () => {
    test("[E2E-TC-CM-001] lists non-archived modules for jobseekers", async () => {
      // Setup: Create test courses as admin
      await coursesPage.createCourse(courseData.kitchenCourse);
      
      await coursesPage.createCourse({
        title: "Kitchen Deep Clean",
        category: "kitchen", 
        role: "beginner",
        description: "Advanced cleaning techniques"
      });
      
      // Archive one course
      await coursesPage.archiveCourse("Kitchen Deep Clean");
      
      // Switch to jobseeker and verify
      await coursesPage.switchToJobseeker(loginPage);
      
      // Verify only non-archived courses are visible
      await expect(coursesPage.getCourseItem(courseData.kitchenCourse.title)).toBeVisible();
      await expect(coursesPage.getCourseItem("Kitchen Deep Clean")).not.toBeVisible();
    });

    test("[E2E-TC-CM-002] admin can see all modules including archived", async () => {
      await coursesPage.createCourse(courseData.deliveryCourse);
      await coursesPage.archiveCourse(courseData.deliveryCourse.title);
      
      // Admin should still see archived courses
      await expect(coursesPage.getCourseItem(courseData.deliveryCourse.title)).toBeVisible();
    });

    test("[E2E-TC-CM-003] filters modules by category", async () => {
      await coursesPage.createCourse(courseData.deliveryCourse);
      await coursesPage.createCourse(courseData.accountingCourse);
      
      await coursesPage.filterByCategory("delivery");
      
      await expect(coursesPage.getCourseItem(courseData.deliveryCourse.title)).toBeVisible();
      await expect(coursesPage.getCourseItem(courseData.accountingCourse.title)).not.toBeVisible();
    });

    test("[E2E-TC-CM-004] searches modules by title", async () => {
      await coursesPage.createCourse(courseData.deliveryCourse);
      await coursesPage.createCourse(courseData.accountingCourse);
      
      await coursesPage.searchCourses("Delivery");
      
      await expect(coursesPage.getCourseItem(courseData.deliveryCourse.title)).toBeVisible();
      await expect(coursesPage.getCourseItem(courseData.accountingCourse.title)).not.toBeVisible();
    });
  });

  test.describe("Add Course Page - Course Creation", () => {
    test("[E2E-TC-CM-010] admin can create a module", async () => {
      await coursesPage.createCourse(courseData.kitchenCourse);
      
      await coursesPage.waitForSuccessMessage();
      await expect(coursesPage.getCourseItem(courseData.kitchenCourse.title)).toBeVisible();
    });

    test("[E2E-TC-CM-011] admin can create a delivery module", async () => {
      await coursesPage.createCourse(courseData.deliveryCourse);
      
      await coursesPage.waitForSuccessMessage();
      await expect(coursesPage.getCourseItem(courseData.deliveryCourse.title)).toBeVisible();
    });

    test("[E2E-TC-CM-012] jobseeker cannot create a module", async () => {
      // Switch to jobseeker
      await coursesPage.switchToJobseeker(loginPage);
      
      // Verify add course button is not visible
      await expect(coursesPage.btnAddCourse).not.toBeVisible();
    });

    test("[E2E-TC-CM-013] fails when title is missing", async () => {
      await coursesPage.navigateToAddCourse();
      
      await coursesPage.addCategory.selectOption("delivery");
      await coursesPage.addRole.selectOption("beginner");
      await coursesPage.submitAddCourse();
      
      await coursesPage.waitForErrorMessage();
      await expect(coursesPage.addError).toContainText("required");
    });

    test("[E2E-TC-CM-014] fails when category is missing", async () => {
      await coursesPage.navigateToAddCourse();
      
      await coursesPage.addTitle.fill("No Category Module");
      await coursesPage.addRole.selectOption("beginner");
      await coursesPage.submitAddCourse();
      
      await coursesPage.waitForErrorMessage();
      await expect(coursesPage.addError).toContainText("required");
    });
  });

  test.describe("Edit Course Page - Course Updates", () => {
    test.beforeEach(async () => {
      // Create a course to edit
      await coursesPage.createCourse(courseData.kitchenCourse);
    });

    test("[E2E-TC-CM-015] admin can update module archive state", async () => {
      await coursesPage.archiveCourse(courseData.kitchenCourse.title);
      
      // Verify course is archived but still visible to admin
      await expect(coursesPage.getCourseItem(courseData.kitchenCourse.title)).toBeVisible();
    });

    test("[E2E-TC-CM-016] admin can update module details", async () => {
      await coursesPage.editCourse(courseData.kitchenCourse.title, {
        title: "Updated Course Title",
        role: "intermediate",
        description: "Updated description"
      });
      
      await coursesPage.waitForSuccessMessage();
      await expect(coursesPage.getCourseItem("Updated Course Title")).toBeVisible();
    });
  });


  test.describe("Course Details Page - Viewing Course Details", () => {
    test.beforeEach(async () => {
      await coursesPage.createCourse(courseData.deliveryCourse);
    });

    test("[E2E-TC-CM-006] fetches module details successfully", async () => {
      await coursesPage.viewCourseDetails(courseData.deliveryCourse.title);
      
      await expect(coursesPage.detailsTitle).toContainText(courseData.deliveryCourse.title);
      await expect(coursesPage.detailsCategory).toContainText("delivery");
      await expect(coursesPage.detailsRole).toContainText("intermediate");
    });

    test("[E2E-TC-CM-007] jobseeker cannot fetch archived module details", async () => {
      // Archive the course as admin
      await coursesPage.archiveCourse(courseData.deliveryCourse.title);
      
      // Switch to jobseeker
      await coursesPage.switchToJobseeker(loginPage);
      
      // Verify archived course is not visible in list
      await expect(coursesPage.getCourseItem(courseData.deliveryCourse.title)).not.toBeVisible();
    });

    test("[E2E-TC-CM-008] admin can fetch archived module details", async () => {
      await coursesPage.archiveCourse(courseData.deliveryCourse.title);
      
      // Admin should be able to view archived course details
      await coursesPage.viewCourseDetails(courseData.deliveryCourse.title);
      
      await expect(coursesPage.detailsTitle).toContainText(courseData.deliveryCourse.title);
      await expect(coursesPage.courseDetailsSection).toBeVisible();
    });
  });

  test.describe("Bulk Operations - Multiple Course Management", () => {
    test.beforeEach(async () => {
      // Create multiple courses for bulk operations
      for (const course of courseData.bulkCourses) {
        await coursesPage.createCourse(course);
      }
    });

    test("[E2E-TC-CM-028] bulk deletes modules successfully", async () => {
      // Select courses for bulk deletion
      await coursesPage.selectCourse(courseData.bulkCourses[0].title);
      await coursesPage.selectCourse(courseData.bulkCourses[1].title);
      
      await expect(coursesPage.bulkActions).toBeVisible();
      await expect(coursesPage.selectedCount).toContainText("2 selected");
      
      await coursesPage.performBulkDelete();
      await coursesPage.confirmDialog();
      
      // Verify courses are deleted
      await expect(coursesPage.getCourseItem(courseData.bulkCourses[0].title)).not.toBeVisible();
      await expect(coursesPage.getCourseItem(courseData.bulkCourses[1].title)).not.toBeVisible();
      await expect(coursesPage.getCourseItem(courseData.bulkCourses[2].title)).toBeVisible();
    });

    test("[E2E-TC-CM-031] bulk archives modules successfully", async () => {
      // Select courses for bulk archive
      await coursesPage.selectCourse(courseData.bulkCourses[0].title);
      await coursesPage.selectCourse(courseData.bulkCourses[1].title);
      
      await coursesPage.performBulkArchive();
      
      // Verify courses are archived
      await expect(coursesPage.getCourseItem(courseData.bulkCourses[0].title)).toBeVisible();
      await expect(coursesPage.getCourseItem(courseData.bulkCourses[1].title)).toBeVisible();
    });
  });

  test.describe("Access Control - Role-Based Permissions", () => {
    test("[E2E-TC-CM-012] jobseeker cannot see admin controls", async () => {
      // Switch to jobseeker
      await coursesPage.switchToJobseeker(loginPage);
      
      // Verify admin controls are not visible
      const adminControls = await coursesPage.getAdminControls();
      await expect(adminControls.addCourseBtn).not.toBeVisible();
      await expect(adminControls.bulkActions).not.toBeVisible();
    });
  });
});
