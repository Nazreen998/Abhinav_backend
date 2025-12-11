const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    salesmanName: { type: String, required: true },
    area: { type: String, required: true },

    shopLat: Number,
    shopLng: Number,
    salesmanLat: Number,
    salesmanLng: Number,

    distance: Number,
    matchStatus: { type: String, enum: ["SUCCESS", "FAILED"], required: true },

    matchImage: { type: String }, // uploads/history
}, { timestamps: true });

module.exports = mongoose.model("History", historySchema);
