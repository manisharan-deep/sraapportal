// Jest setup for integration tests
process.env.NODE_ENV = "test";
process.env.PG_DB = process.env.PG_DB || "devops_task_manager_test";

const sequelize = require("../config/sequelize");

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});
