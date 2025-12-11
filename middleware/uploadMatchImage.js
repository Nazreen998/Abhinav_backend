const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/history/");
    },
    filename: (req, file, cb) => {
        cb(null, "match_" + Date.now() + "_" + file.originalname.replace(/\s+/g, "_"));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ["image/png", "image/jpg", "image/jpeg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid image format"), false);
};

module.exports = multer({
    storage,
    fileFilter
}).single("matchImage");  // FIELD NAME REQUIRED
