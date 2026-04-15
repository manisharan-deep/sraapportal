// User routes
const express = require("express");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const { listUsers, getMe } = require("../controllers/userController");

const router = express.Router();

router.use(auth);

router.get("/me", getMe);
router.get("/", roles("admin"), listUsers);

module.exports = router;
