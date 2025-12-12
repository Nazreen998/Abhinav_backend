const mongoose = require("mongoose");

const assignedShopSchema = new mongoose.Schema(
  {
    salesman_name: { type: String, required: true },
    salesman_segment: { type: String, required: true },

    shop_name: { type: String, required: true },
    shop_segment: { type: String, required: true },

    sequence: { type: Number, required: true },

    assigned_by: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
  },
  {
    timestamps: {
      createdAt: "assigned_at",
      updatedAt: false,
    },
  }
);

module.exports = mongoose.model("AssignedShop", assignedShopSchema);
