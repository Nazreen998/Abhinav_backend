const router = require("express").Router();
const ctrl = require("../controllers/assignedController");
const auth = require("../middleware/auth");

// MANAGER/MASTER -> RESET + ASSIGN
router.post("/reset-assign", auth(["master", "manager"]), ctrl.resetAndAssignManual);

// LIST
router.get("/list", auth(["master", "manager", "salesman"]), ctrl.listAssigned);

// REMOVE
router.post("/remove", auth(["master", "manager"]), ctrl.removeAssigned);

// REORDER
router.post("/reorder", auth(["master", "manager"]), ctrl.reorderAssigned);

// ✅ MODIFY DATE ROUTE
router.post("/modify-date", modifyAssignmentDate);

module.exports = router;
