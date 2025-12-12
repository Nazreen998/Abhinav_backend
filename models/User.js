const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["master", "manager", "salesman"],
      required: true,
    },
    segment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // ✅ createdAt & updatedAt auto
  }
);

module.exports = mongoose.model("User", userSchema);
