// Task integration tests
const request = require("supertest");
const app = require("../app");

const registerAndLogin = async () => {
  await request(app)
    .post("/api/auth/register")
    .send({
      name: "Task Owner",
      email: "task.owner@example.com",
      password: "Password123"
    });

  const login = await request(app)
    .post("/api/auth/login")
    .send({
      email: "task.owner@example.com",
      password: "Password123"
    });

  return login.body.token;
};

describe("Tasks API", () => {
  test("create, list, update, delete", async () => {
    const token = await registerAndLogin();

    const created = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Ship release",
        description: "Prepare deployment manifest"
      });

    expect(created.statusCode).toBe(201);
    const taskId = created.body.id;

    const list = await request(app)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(list.statusCode).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);

    const updated = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "In Progress" });

    expect(updated.statusCode).toBe(200);
    expect(updated.body.status).toBe("In Progress");

    const removed = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(removed.statusCode).toBe(204);
  });
});
