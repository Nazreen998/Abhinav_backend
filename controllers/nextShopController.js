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
    }).lean();

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: "Salesman not found",
      });
    }

    // 2️⃣ PURE READ using AGGREGATION (NO VALIDATION POSSIBLE)
    let shops = await AssignedShop.aggregate([
      {
        $match: {
          $or: [
            { salesman_id: salesman._id, status: "active" },
            { salesman_name: salesman.name },
          ],
        },
      },
      {
        $sort: { sequence: 1, createdAt: 1 },
      },
      {
        $limit: 1,
      },
    ]);

    if (!shops || shops.length === 0) {
      return res.json({
        success: false,
        message: "No assigned shops",
      });
    }

    // 3️⃣ SUCCESS
    return res.json({
  success: true,
  shops: [shop],   // 🔥 THIS IS THE KEY
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
