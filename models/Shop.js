const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    shopAddress: { type: String },
    segment: { type: String, enum: ["fmcg", "pipes"], required: true },

    area: { type: String },
    ownerName: { type: String },
    contactNumber: { type: String },

    latitude: { type: Number },
    longitude: { type: Number },

    shopImage: { type: String },
    createdBy: { type: String },

    // ⭐ SOFT DELETE FLAG
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Shop", shopSchema);
