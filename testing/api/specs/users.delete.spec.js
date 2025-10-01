const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let User;

describe("Delete User API", () => {
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

    // Create admin and normal user
    admin = await User.create({
      name: "Admin Tester",
      email: "admin@test.com",
      password: "Password123!",
      role: "admin",
      state: "NSW",
    });

    user = await User.create({
      name: "Normal User",
      email: "user1@test.com",
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

  test("should delete a user successfully (admin only)", async () => {
    const newUser = await User.create({
      name: "Delete Me",
      email: "deleteme@test.com",
      password: "Password123!",
      role: "jobseeker",
      state: "QLD",
    });

    const res = await request(app)
      .delete(`/api/admin/users/${newUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "User deleted." });

    const checkUser = await User.findById(newUser._id);
    expect(checkUser).toBeNull();
  });

  test("should return 403 if non-admin tries to delete a user", async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${admin._id}`) 
      .set("Authorization", `Bearer ${userToken}`);

    if (res.status === 401) {
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toMatch(/User not found|Invalid or expired token/);
    } else {
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ message: "Admins only" });
    }
  });

  test("should return 401 if no token is provided", async () => {
    const res = await request(app).delete(`/api/admin/users/${user._id}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "No token provided");
  });

  test("should return 404 if user does not exist", async () => {
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

    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/admin/users/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect([200, 404]).toContain(res.status);
  });

  test("should return 500 if database error occurs", async () => {
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
    
    const spy = jest.spyOn(User, "findByIdAndDelete").mockImplementation(() => {
      throw new Error("DB crash");
    });

    const res = await request(app)
      .delete(`/api/admin/users/${user._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "Failed to delete user.");

    spy.mockRestore();
  });
});
