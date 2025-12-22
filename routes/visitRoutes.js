const router = require("express").Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMatchImage");
const ctrl = require("../controllers/visitController");

// PHOTO UPLOAD
router.post(
  "/uploadPhoto",
  auth(["salesman"]),
  upload,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false });
    }

    res.json({
      success: true,
      path: `/uploads/history/${req.file.filename}`,
    });
  }
);

// SAVE VISIT
router.post(
  "/save",
  auth(["salesman"]),
  ctrl.saveVisit
);

// LIST
router.get(
  "/list",
  auth(["master", "manager", "salesman"]),
  ctrl.getVisits
);

module.exports = router;
