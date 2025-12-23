const Shop = require("../models/Shop");

const safeString = (v) => (v === null || v === undefined ? "" : v);

// ⭐ LIST SHOPS (BACKWARD COMPATIBLE FOR OLD FLUTTER APK)
exports.listShops = async (req, res) => {
  try {
    const shops = await Shop.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ createdAt: -1 });

    const safeShops = shops.map((s) => ({
      _id: s._id,

      // 🔥 FORCE CORRECT VALUES
      shop_id: s._id.toString(),
      shop_name: s.shopName || s.shopNameDisplay || "Unnamed Shop",

      address:
        s.shopAddress ||
        s.area ||
        "Address not available",

      segment: s.segment || "",

      // OPTIONAL (used elsewhere)
      lat: s.latitude || 0,
      lng: s.longitude || 0,
    }));

    res.json({
      success: true,
      shops: safeShops,
    });
  } catch (err) {
    console.error("LIST SHOP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
    });
  }
};
// ⭐ ADD SHOP
exports.addShop = async (req, res) => {
  try {
    const {
      shopName,
      shopAddress,
      latitude,
      longitude,
      segment,
    } = req.body;

    if (!shopName || !segment) {
      return res.status(400).json({
        success: false,
        message: "shopName & segment required",
      });
    }

    const shop = await Shop.create({
      shopName,
      shopAddress: shopAddress || "",
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      segment,
      isDeleted: false,
    });

    res.json({ success: true, shop });
  } catch (e) {
    console.error("ADD SHOP ERROR:", e);
    res.status(500).json({ success: false });
  }
};
// ⭐ UPDATE SHOP
exports.updateShop = async (req, res) => {
  try {
    const id = req.params.id;

    const update = {
      shopName: req.body.shopName,
      shopAddress: req.body.shopAddress,
      segment: req.body.segment,
    };

    const shop =
      id.length > 10
        ? await Shop.findByIdAndUpdate(id, update, { new: true })
        : await Shop.findOneAndUpdate({ shop_id: id }, update, { new: true });

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ⭐ SOFT DELETE SHOP
exports.softDeleteShop = async (req, res) => {
  try {
    const id = req.params.id;

    const shop =
      id.length > 10
        ? await Shop.findByIdAndUpdate(id, { isDeleted: true }, { new: true })
        : await Shop.findOneAndUpdate(
            { shop_id: id },
            { isDeleted: true },
            { new: true }
          );

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    res.json({
      success: true,
      message: "Shop deleted (soft delete)",
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
