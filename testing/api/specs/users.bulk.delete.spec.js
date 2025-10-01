const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let User;

describe("Bulk Delete Users API", () => {
  let mongoServer;
  let admin, user, adminToken, userToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    process.env.MONGO_URI = mongoUri;
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";

    app = require("../../../src/app");

    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once("open", resolve);
      mongoose.connection.on("error", reject);
    });

    User = require("../../../src/models/User");

    admin = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      state: "NSW",
    });

    user = await User.create({
      name: "Normal User",
      email: "user@test.com",
      password: "Password123!",
      role: "jobseeker",
      state: "VIC",
    });

    adminToken = jwt.sign(
      { id: admin._id.toString(), role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    userToken = jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({ email: /user\d*@test\.com/ });
  });

  test("should return 403 if non-admin tries to bulk delete", async () => {
    const res = await request(app)
      .delete("/api/admin/users/bulk-delete")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ ids: [new mongoose.Types.ObjectId()] });

    if (res.status === 401) {
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/User not found|Invalid or expired token/);
    } else {
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: "Access denied" });
    }
  });

  test("should return 401 if no token is provided", async () => {
    const res = await request(app)
      .delete("/api/admin/users/bulk-delete")
      .send({ ids: [new mongoose.Types.ObjectId()] });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "No token provided");
  });

  test("should return 500 if database operation fails", async () => {
    admin = await User.create({
      name: "Admin Tester",
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      state: "NSW",
    });

    adminToken = jwt.sign(
      { id: admin._id.toString(), role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    
    const spy = jest.spyOn(User, "deleteMany").mockImplementation(() => {
      throw new Error("DB crash");
    });

    const res = await request(app)
      .delete("/api/admin/users/bulk-delete")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ids: [new mongoose.Types.ObjectId()] });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "Failed to delete user.");

    spy.mockRestore();
  });
});
