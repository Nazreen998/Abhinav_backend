const AssignedShop = require("../models/AssignedShop");
const History = require("../models/History");
const User = require("../models/User");
const { calculateDistance } = require("../utils/distanceCalculator");

// -------------------------------------------------
// GET NEXT SHOP (FRONTEND COMPATIBLE)
// -------------------------------------------------
exports.getNextShop = async (req, res) => {
  try {
    const { salesmanCode } = req.params;

    // 🔎 Find salesman by user_id (ABHI002)
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

    // 🔥 Get next active shop by sequence
    const shops = await AssignedShop.find({
      salesman_id: salesman._id,
      status: "active",
    }).sort({ sequence: 1 });

    if (shops.length === 0) {
      return res.json({
        success: false,
        message: "No assigned shops",
      });
    }

    res.json({
      success: true,
      nextShop: shops[0],
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
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

    // 🔥 Save history
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

    // 🔥 On success → SOFT REMOVE assigned shop
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
