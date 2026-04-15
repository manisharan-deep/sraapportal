// Task CRUD controller
const { Op } = require("sequelize");
const { Task, User } = require("../models");

const listTasks = async (req, res, next) => {
  try {
    const where =
      req.user.role === "admin"
        ? {}
        : {
            [Op.or]: [
              { assignedToId: req.user.id },
              { createdById: req.user.id }
            ]
          };

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: "assignedTo", attributes: ["id", "name", "email"] },
        { model: User, as: "createdBy", attributes: ["id", "name", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.json(tasks);
  } catch (error) {
    return next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User, as: "assignedTo", attributes: ["id", "name", "email"] },
        { model: User, as: "createdBy", attributes: ["id", "name", "email"] }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role !== "admin" &&
      task.assignedToId !== req.user.id &&
      task.createdById !== req.user.id
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, assignedToId, status } = req.body;

    const task = await Task.create({
      title,
      description,
      status: status || "Pending",
      assignedToId: assignedToId || null,
      createdById: req.user.id
    });

    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (
      req.user.role !== "admin" &&
      task.assignedToId !== req.user.id &&
      task.createdById !== req.user.id
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { title, description, assignedToId, status } = req.body;

    await task.update({
      title: title ?? task.title,
      description: description ?? task.description,
      assignedToId: assignedToId ?? task.assignedToId,
      status: status ?? task.status
    });

    return res.json(task);
  } catch (error) {
    return next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user.role !== "admin" && task.createdById !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await task.destroy();

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = { listTasks, getTask, createTask, updateTask, deleteTask };
