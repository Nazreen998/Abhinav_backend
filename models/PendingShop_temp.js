const mongoose = require("mongoose");

const pendingShopSchema = new mongoose.Schema({
  salesmanId: {
    type: String,
    required: true,
  },

  shopName: {
    type: String,
    required: true,
  },

  address: {
    type: String,
    required: true,
  },

  latitude: {
    type: Number,
    required: true,
  },

  longitude: {
    type: Number,
    required: true,
  },

  image: {
    type: String, // base64
    required: true,
  },

  segment: {
    type: String,
    enum: ["fmcg", "pipes"],
    required: true,
  },
  createdBy: {
  type: String,
},

  status: {
    type: String,
    default: "pending",
  },
}, { timestamps: true });

module.exports = mongoose.model("PendingShop", pendingShopSchema);
