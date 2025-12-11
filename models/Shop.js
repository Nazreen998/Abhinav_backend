const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    area: { type: String, required: true },

    shopAddress: { type: String },
    ownerName: { type: String },
    contactNumber: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },

    shopImage: { type: String }, // uploads/shops
    createdBy: { type: String }, // master / manager
}, { timestamps: true });

module.exports = mongoose.model("Shop", shopSchema);
