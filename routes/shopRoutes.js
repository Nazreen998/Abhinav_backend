const router = require("express").Router();
const shopController = require("../controllers/shopController");
const auth = require("../middleware/auth");
const uploadShopImage = require("../middleware/uploadShopImage");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
// ==============================
// ADD SHOP (salesman + manager)
// ==============================
router.post(
  "/add",
  auth(["salesman", "manager"]),
  uploadShopImage.single("shopImage"),
  shopController.addShop
);

// ==============================
// BULK UPLOAD FROM EXCEL (manager + master)
// ==============================
router.post(
  "/bulk-excel-upload",
  auth(["master", "manager"]),
  upload.single("file"),
  shopController.bulkUploadFromExcel
);
// ==============================
// LIST SHOPS
// ==============================
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  shopController.listShops
);

// ==============================
// APPROVE SHOP
// ==============================
router.put(
  "/approve/:id",
  auth(["master", "manager"]),
  shopController.approveShop
);

// ==============================
// UPDATE SHOP
// ==============================
router.put(
  "/update/:id",
  auth(["master", "manager"]),
  shopController.updateShop
);

// ==============================
// DELETE SHOP
// ==============================
router.delete(
  "/delete/:id",
  auth(["master", "manager"]),
  shopController.softDeleteShop
);

module.exports = router;