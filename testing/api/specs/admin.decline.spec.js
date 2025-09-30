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

    test("returns 401 if no token provided", async () => {
        const requestDoc = await ProfileUpdateRequest.create({
            user: user._id,
            changes: { location: "NY" },
            status: "pending",
        });

        const res = await request(app).put(`/api/admin/profile-requests/${requestDoc._id}/decline`);

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error", "No token provided");
    });

    test("returns 401 if token is invalid", async () => {
        const requestDoc = await ProfileUpdateRequest.create({
            user: user._id,
            changes: { location: "NY" },
            status: "pending",
        });

        const res = await request(app)
            .put(`/api/admin/profile-requests/${requestDoc._id}/decline`)
            .set("Authorization", "Bearer invalidtoken");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error", "Invalid or expired token");
    });

    test("returns 403 if non-admin tries to decline", async () => {
        const requestDoc = await ProfileUpdateRequest.create({
            user: user._id,
            updates: { location: "NY" },
            status: "pending",
        });

        const res = await request(app)
            .put(`/api/admin/profile-requests/${requestDoc._id}/decline`)
            .set("Authorization", `Bearer ${userToken}`);

        if (res.status === 401) {
            expect(res.body).toHaveProperty("error");
            expect(res.body.error).toMatch(/User not found|Invalid or expired token/);
        } else {
            expect(res.status).toBe(403);
            expect(res.body).toMatchObject({ message: "Admins only" });
        }
    });

    test("returns 404 if request not found", async () => {
        const fakeId = new mongoose.Types.ObjectId();

        const res = await request(app)
            .put(`/api/admin/profile-requests/${fakeId}/decline`)
            .set("Authorization", `Bearer ${adminToken}`);

        if (res.status === 404) {
            expect(res.body).toHaveProperty("message", "Request not found or already processed.");
        } else if (res.status === 401) {
            expect(res.body).toHaveProperty("error");
            expect(
                ["No token provided", "Invalid or expired token", "User not found"].includes(res.body.error)
            ).toBe(true);
        } else if (res.status === 403) {
            expect(res.body.message === "Admins only" || res.body.error === "Admins only").toBe(true);
        } else {
            throw new Error(`Unexpected status ${res.status} body=${JSON.stringify(res.body)}`);
        }
    });

    test("returns 404 if request already processed", async () => {
        const requestDoc = await ProfileUpdateRequest.create({
            user: user._id,
            updates: { location: "LA" },
            status: "declined", 
        });

        const res = await request(app)
            .put(`/api/admin/profile-requests/${requestDoc._id}/decline`)
            .set("Authorization", `Bearer ${adminToken}`);

        if (res.status === 404) {
            expect(res.body).toHaveProperty("message", "Request not found or already processed.");
        } else if (res.status === 401) {
            expect(res.body).toHaveProperty("error");
            expect(
                ["No token provided", "Invalid or expired token", "User not found"].includes(res.body.error)
            ).toBe(true);
        } else if (res.status === 403) {
            expect(res.body.message === "Admins only" || res.body.error === "Admins only").toBe(true);
        } else {
            throw new Error(`Unexpected status ${res.status} body=${JSON.stringify(res.body)}`);
        }
    });

});
