// Sequelize client for PostgreSQL
const { Sequelize } = require("sequelize");
const env = require("./env");

const sequelize = new Sequelize(
  env.pg.database,
  env.pg.username,
  env.pg.password,
  {
    host: env.pg.host,
    port: env.pg.port,
    dialect: "postgres",
    logging: false
  }
);

module.exports = sequelize;
