const router = require("express").Router();
const ctrl = require("../controllers/assignedController");
const auth = require("../middleware/auth");

// ASSIGN
router.post(
  "/assign",
  auth(["master", "manager"]),
  ctrl.assignShop
);

// LIST
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  ctrl.getAssignedShops
);

// REMOVE
router.post(
  "/remove",
  auth(["master", "manager"]),
  ctrl.removeAssigned
);

// REORDER
router.post(
  "/reorder",
  auth(["master", "manager"]),
  ctrl.reorderAssignedShops
);

// SALESMAN TODAY
router.get(
  "/salesman/today",
  auth(["salesman"]),
  ctrl.getSalesmanTodayStatus
);
router.post(
  "/edit",
  auth(["master", "manager"]),
  ctrl.editAssignedShop
);

module.exports = router;
