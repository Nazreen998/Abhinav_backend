// helpers/shopIdGenerator.js
const Counter = require("../models/Counter");

async function generateShopId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "shopId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `S${counter.seq.toString().padStart(3, "0")}`;
}

module.exports = generateShopId;
