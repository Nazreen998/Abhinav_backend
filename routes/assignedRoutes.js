const router = require("express").Router();
const ctrl = require("../controllers/assignedController");
const auth = require("../middleware/auth");

// assign
router.post("/assign", auth(["master", "manager"]), ctrl.assignShop);

// list
router.get("/list", auth(["master", "manager", "salesman"]), ctrl.getAssignedShops);

// remove
router.post("/remove", auth(["master", "manager"]), ctrl.removeAssigned);

// reorder (🔥 FIXED)
router.post("/reorder", auth(["master", "manager"]), ctrl.reorderAssignedShops);

// salesman today
router.get(
  "/salesman/today",
  auth(["salesman"]),
  ctrl.getSalesmanTodayStatus
);

module.exports = router;
