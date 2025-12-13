const router = require("express").Router();
const ctrl = require("../controllers/assignedController");
const auth = require("../middleware/auth");

// ================================
// ASSIGN SHOP (MASTER / MANAGER)
// ================================
router.post(
  "/assign",
  auth(["master", "manager"]),
  ctrl.assignShop
);

// ================================
// LIST ASSIGNED SHOPS
// - Master → all
// - Manager → segment wise
// - Salesman → own
// ================================
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  ctrl.getAssignedShops
);

// ================================
// REMOVE ASSIGNED SHOP (SOFT)
// ================================
router.post(
  "/remove",
  auth(["master", "manager"]),
  ctrl.removeAssigned
);

// ================================
// EDIT ASSIGNED SHOP (CHANGE SALESMAN)
// ================================
router.post(
  "/edit",
  auth(["master", "manager"]),
  ctrl.editAssignedShop
);

// ================================
// REORDER SHOPS (DRAG & DROP)
// ================================
router.post(
  "/reorder",
  auth(["master", "manager"]),
  ctrl.reorderAssignedShops
);

// ================================
// SALESMAN TODAY STATUS
// ================================
router.get(
  "/salesman/today",
  auth(["salesman"]),
  ctrl.getSalesmanTodayStatus
);
// RE-ASSIGN REMOVED SHOP
router.post(
  "/reassign",
  auth(["master", "manager"]),
  ctrl.reassignRemovedShop
);


module.exports = router;
