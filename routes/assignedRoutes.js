const router = require("express").Router();
const assignedController = require("../controllers/assignedController");
const auth = require("../middleware/auth");

// Assign shop
router.post(
  "/assign",
  auth(["master", "manager"]),
  assignedController.assignShop
);

// View assigned shops
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  assignedController.getAssignedShops
);

// Reassign shop
router.put(
  "/reassign/:id",
  auth(["master", "manager"]),
  assignedController.reassignShop
);

// Move back to pending
router.put(
  "/move-back/:id",
  auth(["master", "manager"]),
  assignedController.moveBackToPending
);

// ⭐ REMOVE ASSIGNED SHOP
router.delete(
  "/remove",
  auth(["master", "manager"]),
  assignedController.removeAssigned
);

module.exports = router;
