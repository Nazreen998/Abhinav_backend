const router = require("express").Router();
const ctrl = require("../controllers/nextShopController");
const auth = require("../middleware/auth");

router.get("/next", auth(["salesman"]), ctrl.getNextShop);

module.exports = router;
