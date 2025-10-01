const request = require("supertest");

let app;

describe("User Register API", () => {
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

  test("fails to register with missing fields", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Incomplete User",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("fails to register with invalid email format", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Invalid Email",
        email: "not-an-email",
        password: "Password123!",
        role: "jobseeker",
        state: "VIC",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("fails to register with weak password", async () => {
    const response = await request(app)
      .post("/api/users/register")
      .send({
        name: "Weak Password",
        email: `weak-${Date.now()}@example.com`,
        password: "123", 
        role: "jobseeker",
        state: "VIC",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("fails to register duplicate email", async () => {
    const email = `duplicate-${Date.now()}@example.com`;

    await request(app).post("/api/users/register").send({
      name: "First User",
      email,
      password: "Password123!",
      role: "jobseeker",
      state: "VIC",
    });

    const response = await request(app).post("/api/users/register").send({
      name: "Second User",
      email,
      password: "Password123!",
      role: "jobseeker",
      state: "VIC",
    });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty("error");
  });
});

describe("User Login API", () => {
  beforeAll(() => {
    app = global.__app;
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

  // Login API Tests
  test("fails login with wrong password", async () => {
    const email = `wrongpass-${Date.now()}@example.com`;
    const password = "Password123!";

    await request(app).post("/api/users/register").send({
      name: "Wrong Pass User",
      email,
      password,
      role: "jobseeker",
      state: "NSW",
    });

    const response = await request(app)
      .post("/api/users/login")
      .send({ email, password: "WrongPassword!" });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
  });

  test("fails login with non-existent email", async () => {
    const response = await request(app)
      .post("/api/users/login")
      .send({ email: "doesnotexist@example.com", password: "Password123!" });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error");
  });

  test("fails login with missing credentials", async () => {
    const response = await request(app).post("/api/users/login").send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });
});

describe("JWT", () => {
  beforeAll(() => {
    app = global.__app;
  });

  // JWT Tests
  test("rejects request with invalid token", async () => {
    const response = await request(app)
      .get("/api/users/profile")
      .set("Authorization", "Bearer invalidtoken");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Invalid or expired token");
  });

  test("rejects request with no token", async () => {
    const response = await request(app).get("/api/users/profile");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "No token provided");
  });
});