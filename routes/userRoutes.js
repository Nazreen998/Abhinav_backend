const router = require("express").Router();
const userController = require("../controllers/userController");
const { verifyMaster } = require("../middleware/authMiddleware");

router.post("/login", userController.login);
router.post("/add", verifyMaster, userController.addUser);
router.get("/all", verifyMaster, userController.getAllUsers);
router.put("/update/:id", verifyMaster, userController.updateUser);

module.exports = router;
