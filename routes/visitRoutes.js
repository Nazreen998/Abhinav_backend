const router = require("express").Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMatchImage");
const visitController = require("../controllers/visitController");

// 🔥 PHOTO UPLOAD
router.post(
  "/uploadPhoto",
  auth(["salesman"]),
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err) {
        console.error("MULTER ERROR:", err);
        return res.status(400).json({
          success: false,
          message: err.message || "Upload failed",
        });
      }
      next();
    });
  },
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

router.post("/save", auth(["salesman"]), visitController.saveVisit);
router.get("/list", auth(["master", "manager", "salesman"]), visitController.getVisits);

module.exports = router;
