const router = require("express").Router();
const shopController = require("../controllers/shopController");
const auth = require("../middleware/auth");
const uploadShopImage = require("../middleware/uploadShopImage");

// MASTER & MANAGER can add/delete shops
router.post(
    "/add",
    auth(["master", "manager"]),
    uploadShopImage.single("shopImage"),
    shopController.addShop
);

router.get("/list", auth(["master", "manager", "salesman"]), shopController.getAllShops);

router.delete(
    "/delete/:id",
    auth(["master", "manager"]),
    shopController.deleteShop
);

module.exports = router;
