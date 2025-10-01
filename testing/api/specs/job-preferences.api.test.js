const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

let app;
let JobPreference;
let User;

describe("Job Preferences API", () => {
    let mongoServer;
    let user, admin, userToken, adminToken;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        process.env.MONGO_URI = mongoUri;
        process.env.NODE_ENV = "test";
        process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";

        app = require("../../../server"); // Adjust path to your main app

        await new Promise((resolve, reject) => {
            if (mongoose.connection.readyState === 1) return resolve();
            mongoose.connection.once("open", resolve);
            mongoose.connection.on("error", reject);
        });

        JobPreference = require("../../../models/jobPreference");
        User = require("../../../models/User");

        // Create test users
        admin = await User.create({
            name: "Admin User",
            email: "admin@test.com",
            password: "Password123!",
            role: "admin",
            state: "NSW",
        });

        user = await User.create({
            name: "Test User",
            email: "user@test.com",
            password: "Password123!",
            role: "jobseeker",
            state: "VIC",
            active: true
        });

        userToken = jwt.sign(
            { id: user._id.toString(), role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        adminToken = jwt.sign(
            { id: admin._id.toString(), role: admin.role, name: admin.name },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await JobPreference.deleteMany({});
    });

    describe("GET /api/job-preferences", () => {
        it("should return all job preferences for authenticated user", async () => {
            // Create test preferences
            await JobPreference.create([
                {
                    user: user._id,
                    preferredLocation: "Sydney",
                    preferredCategories: ["Software", "Data"]
                },
                {
                    user: user._id,
                    preferredLocation: "Melbourne",
                    preferredCategories: ["Frontend", "Backend"]
                }
            ]);

            const res = await request(app)
                .get("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].preferredLocation).toBe("Melbourne"); // Sorted by createdAt desc
            expect(res.body[1].preferredLocation).toBe("Sydney");
        });

        it("should return empty array when no preferences exist", async () => {
            const res = await request(app)
                .get("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it("should return 401 without authentication", async () => {
            const res = await request(app)
                .get("/api/job-preferences");

            expect(res.status).toBe(401);
            expect(res.body.message).toContain("No token");
        });
    });

    describe("POST /api/job-preferences", () => {
        it("should create job preference with valid data and array categories", async () => {
            const newPref = {
                preferredLocation: "San Francisco",
                preferredCategories: ["Frontend", "Backend"]
            };

            const res = await request(app)
                .post("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send(newPref);

            expect(res.status).toBe(201);
            expect(res.body.preferredLocation).toBe("San Francisco");
            expect(res.body.preferredCategories).toEqual(["Frontend", "Backend"]);
            expect(res.body.user).toBe(user._id.toString());

            // Verify in database
            const dbPref = await JobPreference.findById(res.body._id);
            expect(dbPref.preferredLocation).toBe("San Francisco");
        });

        it("should create job preference with string categories conversion", async () => {
            const newPref = {
                preferredLocation: "Boston",
                preferredCategories: "React, Node.js, MongoDB"
            };

            const res = await request(app)
                .post("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send(newPref);

            expect(res.status).toBe(201);
            expect(res.body.preferredCategories).toEqual(["React", "Node.js", "MongoDB"]);
        });

        it("should handle empty categories array when not provided", async () => {
            const newPref = {
                preferredLocation: "London"
            };

            const res = await request(app)
                .post("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send(newPref);

            expect(res.status).toBe(201);
            expect(res.body.preferredCategories).toEqual([]);
        });

        it("should return 400 when preferredLocation is missing", async () => {
            const newPref = {
                preferredCategories: ["Tech"]
            };

            const res = await request(app)
                .post("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send(newPref);

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("preferredLocation is required");
        });

        it("should return 500 on database error during creation", async () => {
            jest.spyOn(JobPreference, "create").mockImplementation(() => {
                throw new Error("DB creation error");
            });

            const newPref = {
                preferredLocation: "Test Location",
                preferredCategories: ["Test"]
            };

            const res = await request(app)
                .post("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send(newPref);

            expect(res.status).toBe(500);
            expect(res.body.message).toBe("Failed to create preference");

            JobPreference.create.mockRestore();
        });
    });

    describe("PUT /api/job-preferences/:id", () => {
        let testPreference;

        beforeEach(async () => {
            testPreference = await JobPreference.create({
                user: user._id,
                preferredLocation: "Original Location",
                preferredCategories: ["Original"]
            });
        });

        it("should update job preference with valid data", async () => {
            const updates = {
                preferredLocation: "Updated Location",
                preferredCategories: ["Updated Category"]
            };

            const res = await request(app)
                .put(`/api/job-preferences/${testPreference._id}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send(updates);

            expect(res.status).toBe(200);
            expect(res.body.preferredLocation).toBe("Updated Location");
            expect(res.body.preferredCategories).toEqual(["Updated Category"]);

            // Verify update in database
            const updatedPref = await JobPreference.findById(testPreference._id);
            expect(updatedPref.preferredLocation).toBe("Updated Location");
        });

        it("should return 404 when preference not found", async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const updates = {
                preferredLocation: "Updated Location"
            };

            const res = await request(app)
                .put(`/api/job-preferences/${fakeId}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send(updates);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("Preference not found");
        });

        it("should return 404 when user tries to update other user's preference", async () => {
            const otherUser = await User.create({
                name: "Other User",
                email: "other@test.com",
                password: "Password123!",
                role: "jobseeker",
                state: "QLD"
            });

            const otherUserToken = jwt.sign(
                { id: otherUser._id.toString(), role: otherUser.role, name: otherUser.name },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            const updates = {
                preferredLocation: "Should Not Update"
            };

            const res = await request(app)
                .put(`/api/job-preferences/${testPreference._id}`)
                .set("Authorization", `Bearer ${otherUserToken}`)
                .send(updates);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("Preference not found");
        });

        it("should return 500 on database error during update", async () => {
            jest.spyOn(JobPreference, "findOneAndUpdate").mockImplementation(() => {
                throw new Error("DB update error");
            });

            const updates = {
                preferredLocation: "Updated Location"
            };

            const res = await request(app)
                .put(`/api/job-preferences/${testPreference._id}`)
                .set("Authorization", `Bearer ${userToken}`)
                .send(updates);

            expect(res.status).toBe(500);
            expect(res.body.message).toBe("Failed to update preference");

            JobPreference.findOneAndUpdate.mockRestore();
        });
    });

    describe("DELETE /api/job-preferences/:id", () => {
        let testPreference;

        beforeEach(async () => {
            testPreference = await JobPreference.create({
                user: user._id,
                preferredLocation: "Location to Delete",
                preferredCategories: ["Category"]
            });
        });

        it("should delete job preference", async () => {
            const res = await request(app)
                .delete(`/api/job-preferences/${testPreference._id}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);

            // Verify deletion from database
            const deletedPref = await JobPreference.findById(testPreference._id);
            expect(deletedPref).toBeNull();
        });

        it("should return 404 when preference not found", async () => {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .delete(`/api/job-preferences/${fakeId}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("Preference not found");
        });

        it("should return 404 when user tries to delete other user's preference", async () => {
            const otherUser = await User.create({
                name: "Other User",
                email: "other@test.com",
                password: "Password123!",
                role: "jobseeker",
                state: "QLD"
            });

            const otherUserToken = jwt.sign(
                { id: otherUser._id.toString(), role: otherUser.role, name: otherUser.name },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            const res = await request(app)
                .delete(`/api/job-preferences/${testPreference._id}`)
                .set("Authorization", `Bearer ${otherUserToken}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe("Preference not found");
        });

        it("should return 500 on database error during deletion", async () => {
            jest.spyOn(JobPreference, "deleteOne").mockImplementation(() => {
                throw new Error("DB deletion error");
            });

            const res = await request(app)
                .delete(`/api/job-preferences/${testPreference._id}`)
                .set("Authorization", `Bearer ${userToken}`);

            expect(res.status).toBe(500);
            expect(res.body.message).toBe("Failed to delete preference");

            JobPreference.deleteOne.mockRestore();
        });
    });

    describe("DELETE /api/job-preferences (bulk delete)", () => {
        let preferenceIds;

        beforeEach(async () => {
            const prefs = await JobPreference.create([
                {
                    user: user._id,
                    preferredLocation: "Location 1",
                    preferredCategories: ["Cat1"]
                },
                {
                    user: user._id,
                    preferredLocation: "Location 2",
                    preferredCategories: ["Cat2"]
                },
                {
                    user: user._id,
                    preferredLocation: "Location 3",
                    preferredCategories: ["Cat3"]
                }
            ]);

            preferenceIds = prefs.map(p => p._id);
        });

        it("should bulk delete multiple preferences", async () => {
            const res = await request(app)
                .delete("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ ids: [preferenceIds[0], preferenceIds[1]] });

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.removed).toBe(2);

            // Verify deletions
            const remainingPrefs = await JobPreference.find({ user: user._id });
            expect(remainingPrefs).toHaveLength(1);
        });

        it("should return 400 when ids array is empty", async () => {
            const res = await request(app)
                .delete("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ ids: [] });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("ids array required");
        });

        it("should return 400 when ids is not an array", async () => {
            const res = await request(app)
                .delete("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ ids: "not-an-array" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("ids array required");
        });

        it("should return 500 on database error during bulk deletion", async () => {
            jest.spyOn(JobPreference, "deleteMany").mockImplementation(() => {
                throw new Error("DB bulk deletion error");
            });

            const res = await request(app)
                .delete("/api/job-preferences")
                .set("Authorization", `Bearer ${userToken}`)
                .send({ ids: [preferenceIds[0]] });

            expect(res.status).toBe(500);
            expect(res.body.message).toBe("Failed to bulk delete");

            JobPreference.deleteMany.mockRestore();
        });
    });
});