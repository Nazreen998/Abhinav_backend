const router = require("express").Router();
const userController = require("../controllers/userController");

// LOGIN
router.post("/login", userController.login);

// ADD USER
router.post("/add", userController.addUser);

// GET ALL USERS
router.get("/", userController.getAllUsers);

// UPDATE USER
router.put("/:id", userController.updateUser);

// DELETE USER
router.delete("/:id", userController.deleteUser);

module.exports = router;
