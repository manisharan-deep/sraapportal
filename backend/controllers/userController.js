// User controller (admin list + me)
const { User } = require("../models");

const listUsers = async (_req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "createdAt"]
    });
    return res.json(users);
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "createdAt"]
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

module.exports = { listUsers, getMe };
