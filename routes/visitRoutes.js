const router = require("express").Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMatchImage");
const visitController = require("../controllers/visitController");

// 🔥 REQUIRED FOR MATCH FLOW (IMAGE UPLOAD)
router.post(
  "/uploadPhoto",
  auth(["salesman"]),
  upload,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    res.json({
      success: true,
      path: req.file.path,
    });
  }
);

// (existing APIs – keep if needed)
router.post("/save", auth(["salesman"]), visitController.saveVisit);
router.get("/list", auth(["master", "manager", "salesman"]), visitController.getVisits);
router.get(
  "/status/:status",
  auth(["master", "manager", "salesman"]),
  visitController.getVisitByStatus
);

module.exports = router;
