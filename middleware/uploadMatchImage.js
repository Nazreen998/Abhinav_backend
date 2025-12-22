const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ensure folder exists
const uploadDir = "uploads/history";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, "_");
    cb(null, "match_" + Date.now() + "_" + safe);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpg", "image/jpeg"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid image"), false);
};

module.exports = multer({
  storage,
  fileFilter,
}).single("file"); // 🔥 FIELD NAME = "file"
