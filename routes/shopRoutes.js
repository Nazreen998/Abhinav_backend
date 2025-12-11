const router = require("express").Router();
const shopController = require("../controllers/shopController");
const auth = require("../middleware/auth");
const uploadShopImage = require("../middleware/uploadShopImage");

// ADD SHOP
router.post(
    "/add",
    auth(["master", "manager"]),
    uploadShopImage.single("shopImage"),
    shopController.addShop
);

// GET ACTIVE SHOPS
router.get(
    "/list",
    auth(["master", "manager", "salesman"]),
    shopController.listShops
);

// UPDATE SHOP
router.put("/update/:id", shopController.updateShop);

// SOFT DELETE SHOP
router.delete(
    "/delete/:id",
    auth(["master", "manager"]),
    shopController.softDeleteShop
);

module.exports = router;
