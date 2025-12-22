const mongoose = require("mongoose");

const visitLogSchema = new mongoose.Schema(
  {
    salesman_name: { type: String, required: true },
    salesman_id: { type: String, required: true },

    shop_name: { type: String, required: true },
    shop_id: { type: String, required: true },

    visit_date: { type: String, required: true }, // YYYY-MM-DD
    visit_time: { type: String, required: true }, // HH:mm:ss
    datetime: { type: Date, required: true },

    photo_url: { type: String, required: true },

    distance: { type: Number, default: 0 },
    result: { type: String, enum: ["match", "mismatch"], default: "match" },

    status: {
      type: String,
      enum: ["today", "pending", "completed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VisitLog", visitLogSchema);
