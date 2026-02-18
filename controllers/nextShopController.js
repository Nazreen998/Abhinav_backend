
const { calculateDistance } = require("../utils/distanceCalculator");

// =================================================
// GET NEXT SHOPS (ALL ACTIVE)
// =================================================
exports.getNextShop = async (req, res) => {
  try {
    const { salesmanCode } = req.params;

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

    const shops = await AssignedShop.aggregate([
      {
        $match: {
          $or: [
            { salesman_id: salesman._id, status: "active" },
            { salesman_name: salesman.name, status: "active" },
          ],
        },
      },
      {
        $lookup: {
          from: "shops",
          localField: "shop_name",
          foreignField: "shop_name",
          as: "shop",
        },
      },
      {
        $unwind: {
          path: "$shop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          lat: "$shop.lat",
          lng: "$shop.lng",
          address: "$shop.address",
        },
      },
      {
        $project: {
          shop: 0,
        },
      },
      { $sort: { sequence: 1 } },
    ]);

    return res.json({
      success: true,
      shops,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// =================================================
// MATCH SHOP → SAVE HISTORY → REMOVE FROM NEXT
// =================================================
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

    // 🔎 Find assigned shop
    const assigned = await AssignedShop.findOne({
      shop_name,
      salesman_name: req.user.name,
      status: "active",
    });

    if (!assigned) {
      return res.status(404).json({
        success: false,
        message: "Assigned shop not found",
      });
    }

    // 🔎 Get shop details (for address)
    const shop = await Shop.findOne({ shop_name });

    // 📏 Distance
    const distance = calculateDistance(
      Number(salesmanLat),
      Number(salesmanLng),
      Number(shopLat),
      Number(shopLng)
    );

    const status = distance <= 50 ? "SUCCESS" : "FAILED";

    // 🧾 SAVE HISTORY (SCHEMA PERFECT MATCH)
    await History.create({
      shopName: shop_name,
      salesmanName: req.user.name,
      area: area || (shop ? shop.address : ""),

      shopLat: Number(shopLat),
      shopLng: Number(shopLng),
      salesmanLat: Number(salesmanLat),
      salesmanLng: Number(salesmanLng),

      distance: Number(distance),
      matchStatus: status,
      matchImage: req.file.path,
    });

    // 🔥 SUCCESS → REMOVE FROM NEXT SHOP
    if (status === "SUCCESS") {
      assigned.status = "removed";
      await assigned.save();
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
    console.error("MATCH ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
