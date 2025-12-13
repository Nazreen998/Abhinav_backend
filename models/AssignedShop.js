const mongoose = require("mongoose");

const assignedShopSchema = new mongoose.Schema(
  {
    shop_id: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    shop_name: { type: String, required: true },

    salesman_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salesman_name: { type: String, required: true },

    segment: { type: String, required: true },

    sequence: { type: Number, required: true },

    assigned_by_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assigned_by_name: { type: String, required: true },

    assigned_by_role: {
      type: String,
      enum: ["master", "manager"],
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AssignedShop", assignedShopSchema);
