// Auth integration tests
const request = require("supertest");
const app = require("../app");

describe("Auth API", () => {
  test("register and login", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "test.user@example.com",
        password: "Password123"
      });

    expect(register.statusCode).toBe(201);
    expect(register.body.token).toBeDefined();

    const login = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test.user@example.com",
        password: "Password123"
      });

    expect(login.statusCode).toBe(200);
    expect(login.body.token).toBeDefined();
  });
});
