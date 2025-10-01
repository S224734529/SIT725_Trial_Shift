const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let User;
let ProfileUpdateRequest;

describe("Approve Profile Update API", () => {
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
    ProfileUpdateRequest = require("../../../src/models/profileUpdateRequest");

    admin = await User.create({
      name: "Admin Tester",
      email: `adm-${Date.now()}@example.com`,
      password: "Password123!",
      role: "admin",
      state: "NSW",
    });

    user = await User.create({
      name: "Normal User",
      email: `user-${Date.now()}@example.com`,
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

  afterEach(async () => {
    await ProfileUpdateRequest.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test("approves a pending request successfully", async () => {
    const requestDoc = await ProfileUpdateRequest.create({
      user: user._id,
      updates: { state: "QLD" },
      status: "pending",
    });

    const res = await request(app)
      .put(`/api/admin/profile-requests/${requestDoc._id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Profile update approved and applied.");

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.state).toBe("QLD");

    const updatedRequest = await ProfileUpdateRequest.findById(requestDoc._id);
    expect(updatedRequest.status).toBe("approved");
    expect(String(updatedRequest.reviewedBy)).toBe(String(admin._id));
  });

  test("returns 401 if no token provided", async () => {
    const doc = await ProfileUpdateRequest.create({
      user: user._id,
      updates: { state: "WA" },
      status: "pending",
    });

    const res = await request(app).put(`/api/admin/profile-requests/${doc._id}/approve`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "No token provided");
  });

  test("returns 401 if token is invalid", async () => {
    const doc = await ProfileUpdateRequest.create({
      user: user._id,
      updates: { state: "TAS" },
      status: "pending",
    });

    const res = await request(app)
      .put(`/api/admin/profile-requests/${doc._id}/approve`)
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Invalid or expired token");
  });
});
