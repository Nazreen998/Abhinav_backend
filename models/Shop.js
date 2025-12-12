const mongoose = require("mongoose");

// 🇮🇳 IST TIME FUNCTION
const istTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset
  return new Date(now.getTime() + istOffset);
};

const shopSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    shopAddress: { type: String },
    segment: { type: String, enum: ["fmcg", "pipes"], required: true },

    area: { type: String },
    ownerName: { type: String },
    contactNumber: { type: String },

    latitude: { type: Number },
    longitude: { type: Number },

    shopImage: { type: String },
    createdBy: { type: String },

    // ⭐ SOFT DELETE
    isDeleted: { type: Boolean, default: false },

    // 🇮🇳 FORCE IST TIMESTAMPS
    createdAt: { type: Date, default: istTime },
    updatedAt: { type: Date, default: istTime },
  },
  {
    timestamps: false, // ❗ disable default UTC timestamps
  }
);

// 🔄 UPDATE updatedAt in IST on every save/update
shopSchema.pre("save", function (next) {
  this.updatedAt = istTime();
  next();
});

shopSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: istTime() });
  next();
});

module.exports = mongoose.model("Shop", shopSchema);
