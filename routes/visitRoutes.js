const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/visitController");

// SAVE VISIT
router.post("/save", auth(["salesman"]), ctrl.saveVisit);

// LIST VISITS
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  ctrl.getVisits
);

module.exports = router;
