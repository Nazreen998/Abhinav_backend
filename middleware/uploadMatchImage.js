const multer = require("multer");
const fs = require("fs");

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
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, "match_" + Date.now() + "_" + safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpg", "image/jpeg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false); // ❗ DO NOT THROW ERROR
  }
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload.single("matchImage"); // ✅ FINAL
