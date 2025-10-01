const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

const ProfileUpdateRequest = require("../../../src/models/profileUpdateRequest");
const User = require("../../../src/models/User");
const app = require("../../../src/app");

describe("Get all profile requests API", () => {
    let mongoServer;
    let adminToken, userToken;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        await mongoose.connect(mongoServer.getUri(), { dbName: "jest" });

        // Create test admin and user
        const admin = await User.create({
            name: "Admin Tester",
            email: `adm-${Date.now()}@example.com`,
            password: "Password123!",
            role: "admin",
            state: "NSW",
        });

        const user = await User.create({
            name: "Normal User",
            email: `user-${Date.now()}@example.com`,
            password: "Password123!",
            role: "jobseeker",
            state: "VIC",
        });

        // Sign JWTs
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
        // Cleanup
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        // Clear collections between tests (keeps tests isolated)
        await ProfileUpdateRequest.deleteMany({});
    });

    test("returns pending profile requests successfully", async () => {
        const user = await User.findOne({ role: "jobseeker" });

        await ProfileUpdateRequest.create({
            user: user._id,
            status: "pending",
            changes: { state: "QLD" },
        });

        const res = await request(app)
            .get("/api/admin/profile-requests")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toHaveProperty("status", "pending");
        expect(res.body[0].user).toHaveProperty("email", user.email);
    });

    test("returns 401 if no token is provided", async () => {
        const res = await request(app).get("/api/admin/profile-requests");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error", "No token provided");
    });

    test("returns 401 if token is invalid", async () => {
        const res = await request(app)
            .get("/api/admin/profile-requests")
            .set("Authorization", "Bearer invalidtoken");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error", "Invalid or expired token");
    });
});
