const router = require("express").Router();
const userController = require("../controllers/userController");
const User = require("../models/User");

// GET ALL USERS
router.get("/all", async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;


router.post("/login", userController.login);

module.exports = router;
