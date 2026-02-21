const router = require("express").Router();
const shopController = require("../controllers/shopController");
const auth = require("../middleware/auth");
const uploadShopImage = require("../middleware/uploadShopImage");

// ADD SHOP (salesman + manager)
router.post(
  "/add",
  auth(["salesman", "manager"]),
  uploadShopImage.single("shopImage"),
  shopController.addShop
);

// LIST SHOPS (master + manager + salesman)
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  shopController.listShops
);

// APPROVE SHOP (manager + master)
router.put(
  "/approve/:id",
  auth(["master", "manager"]),
  shopController.approveShop
);

// UPDATE SHOP (manager + master)
router.put(
  "/update/:id",
  auth(["master", "manager"]),
  shopController.updateShop
);

// DELETE SHOP (master only)
router.delete(
  "/delete/:id",
  auth(["master","manager"]),
  shopController.softDeleteShop
);

module.exports = router;
