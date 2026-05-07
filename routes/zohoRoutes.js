const express = require("express");
const router = express.Router();

const { getSalesOrders } = require("../zohoService");

// ✅ GET ALL SALES ORDERS
router.get("/salesorders", async (req, res) => {
  try {
    const orders = await getSalesOrders();

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;