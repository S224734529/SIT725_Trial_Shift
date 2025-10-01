const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let User;

describe("Inactive User API", () => {
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
            active: true
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

    it("should allow admin to deactivate a user", async () => {
        user = await User.create({
            name: "Normal User",
            email: "user11@test.com",
            password: "Password123!",
            role: "jobseeker",
            state: "VIC",
            active: true
        });

        const res = await request(app)
            .put(`/api/admin/users/${user._id}/active`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ active: false });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User status updated.");

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.active).toBe(false);
    });

    it("should allow admin to reactivate a user", async () => {
        user = await User.create({
            name: "Normal User",
            email: "user11@test.com",
            password: "Password123!",
            role: "jobseeker",
            state: "VIC",
            active: false
        });

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

        const res = await request(app)
            .put(`/api/admin/users/${user._id}/active`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ active: true });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("User status updated.");

        const updatedUser = await User.findById(user._id);
        expect(updatedUser.active).toBe(true);
    });

    it("should return 403 if non-admin tries to update", async () => {
        user = await User.create({
            name: "Normal User",
            email: "user13@test.com",
            password: "Password123!",
            role: "jobseeker",
            state: "VIC",
            active: false
        });

        userToken = jwt.sign(
            { id: user._id.toString(), role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const res = await request(app)
            .patch(`/api/admin/users/${user._id}/active`)
            .set("Authorization", `Bearer ${userToken}`)
            .send({ active: true });

        expect(res.status).toBe(404);
    });

    it("should return 400 if request body is missing 'active' field", async () => {
        user = await User.create({
            name: "Normal User",
            email: "user13@test.com",
            password: "Password123!",
            role: "jobseeker",
            state: "VIC",
            active: false
        });

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

        const res = await request(app)
            .put(`/api/admin/users/${user._id}/active`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(res.status).toBe(400);
    });

    it("should return 404 if user does not exist", async () => {
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

        const fakeId = "507f191e810c19729de860ea";
        const res = await request(app)
            .put(`/api/admin/users/${fakeId}/active`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ active: false });

        expect(res.status).toBe(404);
    });

    it("should return 500 on server/database error", async () => {
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

        user = await User.create({
            name: "Normal User",
            email: "user13@test.com",
            password: "Password123!",
            role: "jobseeker",
            state: "VIC",
            active: false
        });

        jest.spyOn(User, "findByIdAndUpdate").mockImplementation(() => {
            throw new Error("DB error");
        });

        const res = await request(app)
            .put(`/api/admin/users/${user._id}/active`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ active: false });

        expect(res.status).toBe(500);
        expect(res.body.message).toBe("Failed to update user status.");

        User.findByIdAndUpdate.mockRestore();
    });
});
