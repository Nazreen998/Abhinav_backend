const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    shop_id: { type: String },
    shop_name: { type: String, required: true },
    address: { type: String },

    lat: { type: Number },
    lng: { type: Number },

    segment: { type: String, enum: ["fmcg", "pipes"], required: true },
    status: { type: String, default: "approved" },

    created_by: { type: String },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shop", shopSchema);
