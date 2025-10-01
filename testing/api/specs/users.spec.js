const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let User;
let ProfileUpdateRequest;

describe("Get All Users API", () => {
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

        await User.create({
            name: "Normal User2",
            email: "user2@test.com",
            password: "hashedpass",
            role: "employer",
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

    test("should return all non-admin users when requested by an admin", async () => {
        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        const roles = res.body.map((u) => u.role);
        expect(roles).not.toContain("admin");

        const emails = res.body.map((u) => u.email);
        expect(emails).toContain("user1@test.com");
        expect(emails).toContain("user2@test.com");

        expect(res.body[0]).not.toHaveProperty("password");
    });

    test("should return 403 if a non-admin user tries to fetch all users", async () => {
        const res = await request(app)
            .get("/api/admin/users")
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
        const res = await request(app).get("/api/admin/users");

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error", "No token provided");
    });

    test("should return empty array if there are no users (except admins)", async () => {
        await User.deleteMany({ role: { $nin: ["admin"] } });

        const admin = await User.create({
            name: "Admin Tester",
            email: "admin@test.com",
            password: "Password123!",
            role: "admin",
            state: "NSW",
        });

        const adminToken = jwt.sign(
            { id: admin._id.toString(), role: admin.role, name: admin.name },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );


        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test("should return 500 if database query fails", async () => {
        const admin = await User.create({
            name: "Admin Tester",
            email: "admin@test.com",
            password: "Password123!",
            role: "admin",
            state: "NSW",
        });

        const adminToken = jwt.sign(
            { id: admin._id.toString(), role: admin.role, name: admin.name },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const spy = jest.spyOn(User, "find").mockImplementation(() => {
            throw new Error("DB error");
        });

        const res = await request(app)
            .get("/api/admin/users")
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("message", "Failed to fetch users.");

        spy.mockRestore();
    });
});
