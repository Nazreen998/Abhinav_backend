const router = require("express").Router();
const ctrl = require("../controllers/nextShopController");
const auth = require("../middleware/auth");
const uploadMatchImage = require("../middleware/uploadMatchImage");

// Flutter: /api/assign/next/ABHI002
router.get(
  "/next/:salesmanCode",
  auth(["salesman"]),
  ctrl.getNextShop
);

router.post(
  "/match",
  auth(["salesman"]),
  uploadMatchImage,
  ctrl.matchShop
);

module.exports = router;
