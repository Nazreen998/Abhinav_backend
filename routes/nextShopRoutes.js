const router = require("express").Router();
const nextShopController = require("../controllers/nextShopController");
const auth = require("../middleware/auth");
const uploadMatchImage = require("../middleware/uploadMatchImage");

// Get next shop for salesman
router.get("/next", auth(["salesman"]), nextShopController.getNextShop);

// Match with image (MANDATORY)
router.post(
    "/match",
    auth(["salesman"]),
    uploadMatchImage,   // REQUIRED matchImage
    nextShopController.matchShop
);

module.exports = router;
