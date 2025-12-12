const router = require("express").Router();
const pendingController = require("../controllers/pendingController");
const auth = require("../middleware/auth");

// SALESMAN மட்டும் add panna allow
router.post(
  "/add",
  auth(["salesman"]),
  pendingController.addPendingShop
);

module.exports = router;
