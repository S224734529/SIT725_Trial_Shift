const request = require("supertest");

let app;

describe("User authentication", () => {
  beforeAll(() => {
    app = global.__app;
  });

  test("registers a new user", async () => {
    const email = `playwright-${Date.now()}@example.com`;

    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Test User",
        email,
        password: "Password123!",
        role: "jobseeker",
        state: "VIC",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "User registered successfully");
  });

  test("logs in an existing user", async () => {
    const email = `login-${Date.now()}@example.com`;
    const password = "Password123!";

    await request(app)
      .post("/api/users/register")
      .send({
        name: "Login User",
        email,
        password,
        role: "jobseeker",
        state: "NSW",
      });

    const response = await request(app)
      .post("/api/users/login")
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toMatchObject({
      email,
      name: "Login User",
      role: "jobseeker",
    });
  });
});
