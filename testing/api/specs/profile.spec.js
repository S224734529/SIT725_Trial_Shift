const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../../../src/models/user");
const express = require("express");
const multer = require("multer");
const { uploadProfilePic } = require("../../../src/controllers/userController");
const ProfileUpdateRequest = require("../../../src/models/profileUpdateRequest");
const userController = require("../../../src/controllers/userController");

const eapp = express();
eapp.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

eapp.post("/upload/profile-pic", upload.single("file"), uploadProfilePic);

let app;

describe("Get Profile API", () => {
  let token;
  let userId;

  beforeAll(async () => {
    app = global.__app;

    // Register a test user
    const email = `profile-${Date.now()}@example.com`;
    const password = "Password123!";

    const res = await request(app)
      .post("/api/users/register")
      .send({
        name: "Profile User",
        email,
        password,
        role: "jobseeker",
        state: "VIC",
      });

    expect(res.status).toBe(201);

    // Login to get token
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({ email, password });

    token = loginRes.body.token;
    userId = loginRes.body.user.id;
  });

  test("returns user profile with no pending approval", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("pendingApproval", false);
  });

  test("returns 401 if no token provided", async () => {
    const res = await request(app).get("/api/users/profile");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "No token provided");
  });

  test("returns 401 if token is invalid", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Invalid or expired token");
  });

  test("returns 401 if user does not exist", async () => {
    const fakeToken = jwt.sign(
      { id: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "User not found");
  });
});

describe("Update Profile API", () => {
  let token, user;

  beforeAll(async () => {
    app = global.__app;

    // Clear users and profile requests
    await User.deleteMany({});
    await ProfileUpdateRequest.deleteMany({});

    user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
      role: "jobseeker",
      state: "NSW",
    });

    token = jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  test("updates profile with only one field", async () => {
    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Partial Update" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Profile update submitted for admin approval.");

    const requestDoc = await ProfileUpdateRequest.findOne({
      user: user._id,
      "updates.name": "Partial Update",
    });
    expect(requestDoc).not.toBeNull();
  });

  test("returns 403 if user is admin", async () => {
    const admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "Password123!",
      role: "admin",
      state: "VIC",
    });

    const adminToken = jwt.sign(
      { id: admin._id.toString(), role: "admin", name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Should Fail" });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "Admins cannot update profile.");
  });

  test("returns 401 if user not found", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeToken = jwt.sign(
      { id: fakeId.toString(), role: "jobseeker", name: "Ghost User" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${fakeToken}`)
      .send({ name: "Ghost" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "User not found");
  });

  test("returns 500 if DB error occurs", async () => {
    const existingUser = await User.create({
      name: "DB Test",
      email: "dbtest@example.com",
      password: "Password123!",
      role: "jobseeker",
      state: "NSW",
    });

    const validToken = jwt.sign(
      { id: existingUser._id.toString(), role: existingUser.role, name: existingUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Mock only the controller update method
    jest.spyOn(User, "findByIdAndUpdate").mockImplementationOnce(() => {
      throw new Error("DB crash");
    });

    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ name: "Fail Test" });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "Update failed.");
  });


  test("returns 400 if no valid fields provided", async () => {
    const existingUser = await User.create({
      name: "DB Test",
      email: "dbtest@example.com",
      password: "Password123!",
      role: "jobseeker",
      state: "NSW",
    });

    const validToken = jwt.sign(
      { id: existingUser._id.toString(), role: existingUser.role, name: existingUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "No valid fields provided");
  });

  test("returns 400 if invalid data type is provided", async () => {
    const existingUser = await User.create({
      name: "DB Test",
      email: "dbtest@example.com",
      password: "Password123!",
      role: "jobseeker",
      state: "NSW",
    });

    const validToken = jwt.sign(
      { id: existingUser._id.toString(), role: existingUser.role, name: existingUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ state: 123 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid data format");
  });

  test("updates profile successfully with valid fields", async () => {
    const existingUser = await User.create({
      name: "DB Test",
      email: "dbtest@example.com",
      password: "Password123!",
      role: "jobseeker",
      state: "NSW",
    });

    const validToken = jwt.sign(
      { id: existingUser._id.toString(), role: existingUser.role, name: existingUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .put("/api/users/profile")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ name: "Updated Name", state: "VIC" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Profile update submitted for admin approval.");

    const requestDoc = await ProfileUpdateRequest.findOne({ user: existingUser._id });
    expect(requestDoc).not.toBeNull();
    expect(requestDoc.updates).toMatchObject({ name: "Updated Name", state: "VIC" });
  });

});

describe("Upload Profile Picture API", () => {
  test("should upload a valid file successfully", async () => {
    const res = await request(eapp)
      .post("/upload/profile-pic")
      .attach("file", Buffer.from("dummy content"), "test.png");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("url");
    expect(typeof res.body.url).toBe("string");
  });

  test("should return 400 if no file is uploaded", async () => {
    const res = await request(eapp).post("/upload/profile-pic");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "No file uploaded");
  });

  test("should return 400 if file object is empty", async () => {
    const res = await request(eapp)
      .post("/upload/profile-pic")
      .field("file", "");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "No file uploaded");
  });

  test("should accept different file types (png, jpg, jpeg)", async () => {
    const fileTypes = ["test.png", "test.jpg", "test.jpeg"];
    for (const fileName of fileTypes) {
      const res = await request(eapp)
        .post("/upload/profile-pic")
        .attach("file", Buffer.from("dummy content"), fileName);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("url");
    }
  });
});

describe("Delete Profile Picture API", () => {
  let token;
  let user;
  let app;

  beforeAll(async () => {
    app = global.__app;

    user = await User.create({
      name: "Pic User",
      email: `picuser-${Date.now()}@example.com`,
      password: "Password123!",
      role: "jobseeker",
      state: "NSW",
      profilePic: "/uploads/sample.png",
    });

    token = jwt.sign(
      { id: user._id.toString(), role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    await User.deleteMany({ email: /picuser-/ });
  });

  test("deletes profile picture successfully", async () => {
    const res = await request(app)
      .delete("/api/users/profile/picture")  
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.profilePic).toBeFalsy();
  });

  test("returns 403 if user is admin", async () => {
    const admin = await User.create({
      name: "Admin User",
      email: `admin-pic-${Date.now()}@example.com`,
      password: "Password123!",
      role: "admin",
      state: "VIC",
      profilePic: "/uploads/admin.png",
    });

    const adminToken = jwt.sign(
      { id: admin._id.toString(), role: "admin", name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .delete("/api/users/profile/picture")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "Admins cannot update profile.");

    // cleanup this admin user (optional)
    await User.findByIdAndDelete(admin._id);
  });

  test("returns 401 if no token is provided", async () => {
    const res = await request(app).delete("/api/users/profile/picture");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "No token provided");
  });

  test("returns 401 if token is invalid", async () => {
    const res = await request(app)
      .delete("/api/users/profile/picture")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Invalid or expired token");
  });

  test("returns 401 if user does not exist", async () => {
    const fakeToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .delete("/api/users/profile/picture")
      .set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "User not found");
  });

  test("returns 500 if database update throws an error", async () => {
    const errUser = await User.create({
      name: "Error User",
      email: `err-${Date.now()}@example.com`,
      password: "pass",
      role: "jobseeker",
      state: "VIC",
      profilePic: "/uploads/err.png",
    });

    const errToken = jwt.sign(
      { id: errUser._id.toString(), role: errUser.role, name: errUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const spy = jest.spyOn(User, "findByIdAndUpdate")
      .mockImplementation(() => { throw new Error("DB error"); });

    const res = await request(app)
      .delete("/api/users/profile/picture")
      .set("Authorization", `Bearer ${errToken}`);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message", "Failed to delete picture.");

    spy.mockRestore();

    await User.findByIdAndDelete(errUser._id);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});