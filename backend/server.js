// Entry point for starting the API server
const env = require("./config/env");
const sequelize = require("./config/sequelize");
const { connectMongo } = require("./config/mongoose");
const app = require("./app");

// Initialize databases and start the HTTP server
const start = async () => {
  try {
    await sequelize.authenticate();
    if (env.nodeEnv !== "production") {
      await sequelize.sync();
    }

    await connectMongo();

    app.listen(env.port, () => {
      console.log(`API listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
