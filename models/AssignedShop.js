const mongoose = require("mongoose");

const assignedShopSchema = new mongoose.Schema(
  {
    salesman_name: { type: String, required: true },
    shop_name: { type: String, required: true },

    // ✅ ONLY ONE SEGMENT FIELD
    segment: { type: String, required: true },

    sequence: { type: Number, required: true },

    assigned_by: { type: String, required: true },
    assigned_by_role: {
      type: String,
      enum: ["master", "manager"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AssignedShop", assignedShopSchema);
