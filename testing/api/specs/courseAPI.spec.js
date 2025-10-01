const request = require("supertest");
const User = require("../../../src/models/user");
const Module = require("../../../src/models/module");

let app;

async function createUserAndToken({
  role = "jobseeker",
  name = "API Tester",
  password = "Password123!",
  state = "Victoria",
} = {}) {
  const email = `${role}-${Date.now()}@example.com`;
  await User.create({ name, email, password, role, state });

  const { body } = await request(app)
    .post("/api/users/login")
    .send({ email, password });

  return { token: body.token, email };
}

describe("Course Management API", () => {
  beforeAll(() => {
    app = global.__app;
  });

  beforeEach(async () => {
    // Clear modules before each test
    await Module.deleteMany({});
  });

  describe("GET /api/courses/modules", () => {
    test("lists non-archived modules for jobseekers", async () => {
      await Module.create([
        {
          title: "Kitchen Basics",
          category: "kitchen",
          role: "beginner",
          isArchived: false,
        },
        {
          title: "Kitchen Deep Clean",
          category: "kitchen",
          role: "beginner",
          isArchived: true,
        },
      ]);

      const { token } = await createUserAndToken({ role: "jobseeker" });
      const response = await request(app)
        .get("/api/courses/modules")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const titles = response.body.map((m) => m.title);
      expect(titles).toContain("Kitchen Basics");
      expect(titles).not.toContain("Kitchen Deep Clean");
    });

    test("admin can see all modules including archived", async () => {
      await Module.create([
        {
          title: "Delivery Induction",
          category: "delivery",
          role: "beginner",
          isArchived: false,
        },
        {
          title: "Archived Delivery Induction",
          category: "delivery",
          role: "beginner",
          isArchived: true,
        },
      ]);

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .get("/api/courses/modules")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const titles = response.body.map((m) => m.title);
      expect(titles).toContain("Delivery Induction");
      expect(titles).toContain("Archived Delivery Induction");
    });

    test("filters modules by category", async () => {
      await Module.create([
        {
          title: "Delivery Logistics",
          category: "delivery",
          role: "beginner",
          isArchived: false,
        },
        {
          title: "Accounting Essentials",
          category: "accounting",
          role: "beginner",
          isArchived: false,
        },
      ]);

      const { token } = await createUserAndToken({ role: "jobseeker" });
      const response = await request(app)
        .get("/api/courses/modules?category=delivery")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        title: "Delivery Logistics",
        category: "delivery",
      });
    });

    test("searches modules by title", async () => {
      await Module.create([
        {
          title: "Advanced Delivery Planning",
          category: "delivery",
          role: "advanced",
          isArchived: false,
        },
        {
          title: "Accounting Fundamentals",
          category: "accounting",
          role: "beginner",
          isArchived: false,
        },
      ]);

      const { token } = await createUserAndToken({ role: "jobseeker" });
      const response = await request(app)
        .get("/api/courses/modules?search=Delivery")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toContain("Delivery");
    });

    test("filters only archived modules for admin", async () => {
      await Module.create([
        {
          title: "Delivery Refresher",
          category: "delivery",
          role: "beginner",
          isArchived: false,
        },
        {
          title: "Archived Delivery Refresher",
          category: "delivery",
          role: "beginner",
          isArchived: true,
        },
      ]);

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .get("/api/courses/modules?archived=only")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe("Archived Delivery Refresher");
      expect(response.body[0].isArchived).toBe(true);
    });
  });

  describe("POST /api/courses/modules", () => {
    test("admin can create a module", async () => {
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .post("/api/courses/modules")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Kitchen Onboarding",
          category: "kitchen",
          role: "beginner",
          description: "API created course",
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: "Kitchen Onboarding",
        category: "kitchen",
        role: "beginner",
      });
    });

    test("admin can create a delivery module", async () => {
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .post("/api/courses/modules")
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Delivery Route Planning",
          category: "delivery",
          role: "intermediate",
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("Delivery Route Planning");
    });

    test("jobseeker cannot create a module", async () => {
      const { token } = await createUserAndToken({ role: "jobseeker" });

      const response = await request(app)
        .post("/api/courses/modules")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Unauthorized Kitchen Module", category: "kitchen" });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Access denied");
    });

    test("fails when title is missing", async () => {
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .post("/api/courses/modules")
        .set("Authorization", `Bearer ${token}`)
        .send({ category: "delivery" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("fails when category is missing", async () => {
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .post("/api/courses/modules")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "No Category Module" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/courses/modules/:id", () => {
    test("fetches module details successfully", async () => {
      const module = await Module.create({
        title: "Delivery Orientation",
        category: "delivery",
        role: "beginner",
        isArchived: false,
      });

      const { token } = await createUserAndToken({ role: "jobseeker" });
      const response = await request(app)
        .get(`/api/courses/modules/${module.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        title: "Delivery Orientation",
        category: "delivery",
      });
    });

    test("jobseeker cannot fetch archived module details", async () => {
      const module = await Module.create({
        title: "Archived Delivery Induction",
        category: "delivery",
        role: "beginner",
        isArchived: true,
      });

      const { token } = await createUserAndToken({ role: "jobseeker" });
      const response = await request(app)
        .get(`/api/courses/modules/${module.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Module not found");
    });

    test("admin can fetch archived module details", async () => {
      const module = await Module.create({
        title: "Archived Delivery Induction",
        category: "delivery",
        role: "beginner",
        isArchived: true,
      });

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .get(`/api/courses/modules/${module.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Archived Delivery Induction");
    });

    test("returns 404 for non-existent module", async () => {
      const { token } = await createUserAndToken({ role: "jobseeker" });
      const response = await request(app)
        .get("/api/courses/modules/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Module not found");
    });
  });

  describe("PATCH /api/courses/modules/:id", () => {
    test("admin can update module archive state", async () => {
      const { token } = await createUserAndToken({ role: "admin" });
      const module = await Module.create({
        title: "Seasonal Menu Overview",
        category: "kitchen",
        role: "beginner",
        isArchived: false,
      });

      const response = await request(app)
        .patch(`/api/courses/modules/${module.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ isArchived: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isArchived", true);
    });

    test("admin can update module details", async () => {
      const { token } = await createUserAndToken({ role: "admin" });
      const module = await Module.create({
        title: "Delivery Equipment Basics",
        category: "delivery",
        role: "beginner",
        isArchived: false,
      });

      const response = await request(app)
        .patch(`/api/courses/modules/${module.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Delivery Equipment Advanced", role: "intermediate" });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Delivery Equipment Advanced");
      expect(response.body.role).toBe("intermediate");
    });

    test("returns 404 when updating non-existent module", async () => {
      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .patch("/api/courses/modules/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "New Title" });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Module not found");
    });
  });

  describe("DELETE /api/courses/modules/:id", () => {
    test("admin can delete a module", async () => {
      const { token } = await createUserAndToken({ role: "admin" });
      const module = await Module.create({
        title: "Temporary Training",
        category: "kitchen",
        role: "beginner",
      });

      const response = await request(app)
        .delete(`/api/courses/modules/${module.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Module deleted");

      const deleted = await Module.findById(module.id);
      expect(deleted).toBeNull();
    });

    test("admin can delete a delivery module", async () => {
      const { token } = await createUserAndToken({ role: "admin" });
      const module = await Module.create({
        title: "Delivery Safety Review",
        category: "delivery",
        role: "beginner",
      });

      const response = await request(app)
        .delete(`/api/courses/modules/${module.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Module deleted");
    });

    test("returns 404 when deleting non-existent module", async () => {
      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .delete("/api/courses/modules/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Module not found");
    });
  });

  describe("POST /api/courses/modules/:id/assets", () => {
    test("uploads text asset successfully", async () => {
      const module = await Module.create({
        title: "Delivery Orientation",
        category: "delivery",
        role: "beginner",
      });

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .post(`/api/courses/modules/${module.id}/assets`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "text",
          title: "Course Content",
          text: "This is the course content text",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Asset uploaded");
      expect(response.body.asset).toMatchObject({
        type: "text",
        title: "Course Content",
        text: "This is the course content text",
      });

      const updatedModule = await Module.findById(module.id);
      expect(updatedModule.assets).toHaveLength(1);
    });

    test("fails when type is missing for non-file asset", async () => {
      const module = await Module.create({
        title: "Delivery Orientation",
        category: "delivery",
        role: "beginner",
      });

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .post(`/api/courses/modules/${module.id}/assets`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Invalid Asset",
          text: "Some text",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("fails when title is missing for non-file asset", async () => {
      const module = await Module.create({
        title: "Delivery Orientation",
        category: "delivery",
        role: "beginner",
      });

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .post(`/api/courses/modules/${module.id}/assets`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "text",
          text: "Some text",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("fails when URL is missing for non-text asset", async () => {
      const module = await Module.create({
        title: "Delivery Orientation",
        category: "delivery",
        role: "beginner",
      });

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .post(`/api/courses/modules/${module.id}/assets`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "link",
          title: "External Link",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /api/courses/modules/:id/assets/:assetId", () => {
    test("deletes asset successfully", async () => {
      const module = await Module.create({
        title: "Delivery Orientation",
        category: "delivery",
        role: "beginner",
        assets: [{
          type: "text",
          title: "To Delete",
          text: "This will be deleted",
        }],
      });

      const assetId = module.assets[0]._id;
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .delete(`/api/courses/modules/${module.id}/assets/${assetId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Asset removed");

      const updatedModule = await Module.findById(module.id);
      expect(updatedModule.assets).toHaveLength(0);
    });

    test("returns 404 when asset not found", async () => {
      const module = await Module.create({
        title: "Delivery Orientation",
        category: "delivery",
        role: "beginner",
      });

      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .delete(`/api/courses/modules/${module.id}/assets/507f1f77bcf86cd799439011`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Asset not found");
    });

    test("returns 404 when module not found", async () => {
      const { token } = await createUserAndToken({ role: "admin" });
      const response = await request(app)
        .delete("/api/courses/modules/507f1f77bcf86cd799439011/assets/507f1f77bcf86cd799439012")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Module not found");
    });
  });

  describe("DELETE /api/courses/modules/bulk-delete", () => {
    test("bulk deletes modules successfully", async () => {
      const modules = await Module.create([
        { title: "Kitchen Basics", category: "kitchen", role: "beginner" },
        { title: "Accounting Essentials", category: "accounting", role: "beginner" },
        { title: "Delivery Refresher", category: "delivery", role: "intermediate" },
      ]);

      const moduleIds = modules.map(m => m._id);
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .delete("/api/courses/modules/bulk-delete")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: moduleIds });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Courses deleted successfully");

      const remainingModules = await Module.find({ _id: { $in: moduleIds } });
      expect(remainingModules).toHaveLength(0);
    });

    test("fails with empty IDs array", async () => {
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .delete("/api/courses/modules/bulk-delete")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: [] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    test("fails with invalid IDs array", async () => {
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .delete("/api/courses/modules/bulk-delete")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: "not-an-array" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PATCH /api/courses/modules/bulk-archive", () => {
    test("bulk archives modules successfully", async () => {
      const modules = await Module.create([
        { title: "Kitchen Basics", category: "kitchen", role: "beginner", isArchived: false },
        { title: "Accounting Essentials", category: "accounting", role: "beginner", isArchived: false },
      ]);

      const moduleIds = modules.map(m => m._id);
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .patch("/api/courses/modules/bulk-archive")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: moduleIds, isArchived: true });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Courses archived successfully");

      const archivedModules = await Module.find({ _id: { $in: moduleIds }, isArchived: true });
      expect(archivedModules).toHaveLength(2);
    });

    test("bulk unarchives modules successfully", async () => {
      const modules = await Module.create([
        { title: "Kitchen Basics", category: "kitchen", role: "beginner", isArchived: true },
        { title: "Accounting Essentials", category: "accounting", role: "beginner", isArchived: true },
      ]);

      const moduleIds = modules.map(m => m._id);
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .patch("/api/courses/modules/bulk-archive")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: moduleIds, isArchived: false });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Courses unarchived successfully");

      const unarchivedModules = await Module.find({ _id: { $in: moduleIds }, isArchived: false });
      expect(unarchivedModules).toHaveLength(2);
    });

    test("fails with empty IDs array", async () => {
      const { token } = await createUserAndToken({ role: "admin" });

      const response = await request(app)
        .patch("/api/courses/modules/bulk-archive")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: [], isArchived: true });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

});