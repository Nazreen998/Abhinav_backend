const router = require("express").Router();
const visitController = require("../controllers/visitController");
const auth = require("../middleware/auth");

// SAVE VISIT
router.post(
  "/save",
  auth(["salesman"]),
  visitController.saveVisit
);

// GET ALL VISITS
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  visitController.getVisits
);

// TODAY / PENDING / COMPLETED
router.get(
  "/status/:status",
  auth(["master", "manager", "salesman"]),
  visitController.getVisitByStatus
);

module.exports = router;
