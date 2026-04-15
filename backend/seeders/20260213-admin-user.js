"use strict";

// Admin user seeder

const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface) => {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME || "Platform Admin";

    if (!email || !password) {
      return;
    }

    const hashed = await bcrypt.hash(password, 12);

    await queryInterface.bulkInsert("users", [
      {
        id: require("crypto").randomUUID(),
        name,
        email,
        password: hashed,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface) => {
    if (!process.env.SEED_ADMIN_EMAIL) {
      return;
    }

    await queryInterface.bulkDelete("users", {
      email: process.env.SEED_ADMIN_EMAIL
    });
  }
};
