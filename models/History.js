const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    salesmanName: { type: String, required: true },

    segment: { type: String, required: true },
    address: { type: String, required: true },

    shopLat: Number,
    shopLng: Number,
    salesmanLat: Number,
    salesmanLng: Number,

    distance: { type: Number, required: true },

    matchStatus: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
    },

    matchImage: { type: String, required: true }, // uploads/...
  },
  { timestamps: true } // ✅ createdAt, updatedAt
);

module.exports = mongoose.model("History", historySchema);
