// MongoDB connection helper
const mongoose = require("mongoose");
const env = require("./env");

const connectMongo = async () => {
  await mongoose.connect(env.mongoUri, {
    autoIndex: true
  });
};

module.exports = { connectMongo };
