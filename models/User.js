const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["master", "manager", "salesman"],
        required: true
    },
    area: { type: String, required: function () { return this.role === "salesman"; } }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
