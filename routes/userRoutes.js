const router = require("express").Router();
const userController = require("../controllers/userController");
const User = require("../models/User");
const { verifyMaster } = require("../middleware/authMiddleware");

// LOGIN
router.post("/login", userController.login);

// GET ALL USERS → Only for MASTER
router.get("/all", verifyMaster, async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
