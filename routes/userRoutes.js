const router = require("express").Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

// REGISTER MASTER
router.post("/register-master", userController.registerMaster);

// LOGIN
router.post("/login", userController.login);

// ADD USER (MASTER only)
router.post("/add", auth, userController.addUser);

// GET USERS (company wise)
router.get("/", auth, userController.getAllUsers);

// UPDATE USER
router.put("/:id", auth, userController.updateUser);

// DELETE USER
router.delete("/:id", auth, userController.deleteUser);

module.exports = router;