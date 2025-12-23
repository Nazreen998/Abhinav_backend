const router = require("express").Router();
const ctrl = require("../controllers/nextShopController");
const auth = require("../middleware/auth");

// Flutter: /api/nextshop/next/:salesmanCode
router.get(
  "/next/:salesmanCode",
  auth(["salesman"]),
  ctrl.getNextShop
);

module.exports = router;
