const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },  // ✔ correct field
    password: { type: String, required: true }, // plain text (same as DB)
    role: {
        type: String,
        enum: ["master", "manager", "salesman"],
        required: true
    },
    segment: { type: String, required: true }   // ✔ from DB
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
