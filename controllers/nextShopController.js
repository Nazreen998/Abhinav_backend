const AssignedShop = require("../models/AssignedShop");
const History = require("../models/History");
const User = require("../models/User");
const { calculateDistance } = require("../utils/distanceCalculator");

// -------------------------------------------------
// GET NEXT SHOP (OLD + NEW DATA COMPATIBLE)
// -------------------------------------------------
exports.getNextShop = async (req, res) => {
  try {
    const { salesmanCode } = req.params;

    // 1️⃣ Find salesman
    const salesman = await User.findOne({
      user_id: salesmanCode,
      role: "salesman",
    });

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: "Salesman not found",
      });
    }

    let shop = null;

    // 2️⃣ Try NEW data (salesman_id)
    shop = await AssignedShop.findOne({
      salesman_id: salesman._id,
    }).sort({ sequence: 1, createdAt: 1 });

    // 3️⃣ Fallback OLD data (salesman_name)
    if (!shop) {
      shop = await AssignedShop.findOne({
        salesman_name: salesman.name,
      }).sort({ sequence: 1, createdAt: 1 });
    }

    // ❌ Still nothing
    if (!shop) {
      return res.json({
        success: false,
        message: "No assigned shops",
      });
    }

    // 🔄 Auto-fix missing fields (silent)
    let updated = false;

    if (!shop.salesman_id) {
      shop.salesman_id = salesman._id;
      updated = true;
    }

    if (!shop.status) {
      shop.status = "active";
      updated = true;
    }

    if (!shop.sequence) {
      shop.sequence = 1;
      updated = true;
    }

    if (updated) {
      await shop.save();
    }

    // ✅ FINAL RESPONSE
    return res.json({
      success: true,
      nextShop: shop,
    });
  } catch (e) {
    console.error("NEXT SHOP ERROR:", e);
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};

// -------------------------------------------------
// MATCH SHOP (IMAGE + DISTANCE)
// -------------------------------------------------
exports.matchShop = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Match image required",
      });
    }

    const {
      shop_name,
      area,
      shopLat,
      shopLng,
      salesmanLat,
      salesmanLng,
    } = req.body;

    const distance = calculateDistance(
      Number(salesmanLat),
      Number(salesmanLng),
      Number(shopLat),
      Number(shopLng)
    );

    const status = distance <= 50 ? "SUCCESS" : "FAILED";

    // 🧾 Save history
    await History.create({
      shop_name,
      area,
      salesman_name: req.user.name,
      shopLat,
      shopLng,
      salesmanLat,
      salesmanLng,
      distance,
      matchStatus: status,
      matchImage: req.file.path,
    });

    // 🔥 SUCCESS → SOFT REMOVE assigned shop
    if (status === "SUCCESS") {
      const doc = await AssignedShop.findOne({
        shop_name,
        salesman_id: req.user.id,
        status: "active",
      });

      if (doc) {
        doc.status = "removed";
        await doc.save();
      }
    }

    res.json({
      success: true,
      status,
      message:
        status === "SUCCESS"
          ? "Match successful"
          : "You are far from shop (50m)",
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
