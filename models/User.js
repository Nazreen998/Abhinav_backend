const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true },   // <-- FIXED
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["master", "manager", "salesman"],
        required: true
    },
    segment: { type: String },    // optional
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
