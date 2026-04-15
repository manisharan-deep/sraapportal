// Task routes
const express = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask
} = require("../controllers/taskController");

const router = express.Router();

router.use(auth);

router.get("/", listTasks);
router.get("/:id", getTask);

router.post(
  "/",
  [
    body("title").isLength({ min: 3 }).withMessage("Title is required"),
    body("assignedToId").optional().isUUID().withMessage("Invalid user id"),
    body("status")
      .optional()
      .isIn(["Pending", "In Progress", "Completed"]) 
      .withMessage("Invalid status")
  ],
  validate,
  createTask
);

router.put(
  "/:id",
  [
    body("assignedToId").optional().isUUID().withMessage("Invalid user id"),
    body("status")
      .optional()
      .isIn(["Pending", "In Progress", "Completed"]) 
      .withMessage("Invalid status")
  ],
  validate,
  updateTask
);

router.delete("/:id", deleteTask);

module.exports = router;
