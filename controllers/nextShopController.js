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

  const shops = await AssignedShop.aggregate([
  {
    $match: {
      $or: [
        { salesman_id: salesman._id, status: "active" },
        { salesman_name: salesman.name },
      ],
    },
  },

  // ✅ ONLY reliable join = shop_name (because OLD DATA)
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

  // ✅ NORMALIZE FIELDS
  {
    $addFields: {
      lat: "$shop.lat",
      lng: "$shop.lng",
      address: {
        $ifNull: ["$shop.address", "$shop.shopAddress"],
      },
    },
  },

  // ✅ CLEAN RESPONSE
  {
    $project: {
      shop: 0,
    },
  },

  { $sort: { sequence: 1 } },
]);


    if (!shops.length) {
      return res.json({
        success: false,
        shops: [],
      });
    }

    // 🔥 IMPORTANT: send ARRAY, not object
    return res.json({
      success: true,
      shops: shops,
    });
  } catch (e) {
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
  shopName: shop_name,               // ✅
  salesmanName: req.user.name,       // ✅

  segment: doc.segment,              // from AssignedShop
  address: doc.address || "",        // from lookup result

  shopLat: Number(shopLat),
  shopLng: Number(shopLng),
  salesmanLat: Number(salesmanLat),
  salesmanLng: Number(salesmanLng),

  distance: Number(distance),
  matchStatus: status,               // SUCCESS / FAILED
  matchImage: req.file.path,          // uploads/...
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
