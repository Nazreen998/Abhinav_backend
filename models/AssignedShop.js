const mongoose = require("mongoose");

const assignedShopSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    area: { type: String, required: true },

    shopLat: Number,
    shopLng: Number,

    salesmanName: { type: String, required: true },
    salesmanArea: { type: String, required: true },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AssignedShop", assignedShopSchema);
