const router = require("express").Router();
const userController = require("../controllers/userController");
const { verifyMaster } = require("../middleware/authMiddleware");

// LOGIN
router.post("/login", userController.login);

// ADD USER
router.post("/add", userController.addUser);

// GET ALL USERS
router.get("/", userController.getAllUsers);

// ✅ UPDATE USER
router.put("/:id", userController.updateUser);

module.exports = router;
