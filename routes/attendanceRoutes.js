const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/attendanceController");

router.post("/check-in", auth(["manager", "salesman"]), ctrl.checkIn);
router.post("/check-out", auth(["manager", "salesman"]), ctrl.checkOut);

module.exports = router;
