const Shop = require("../models/Shop");

const safeString = (v) => (v === null || v === undefined ? "" : v);

// ⭐ LIST SHOPS (BACKWARD COMPATIBLE FOR OLD FLUTTER APK)
exports.listShops = async (req, res) => {
  try {
    const shops = await Shop.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ createdAt: -1 });

    console.log("SHOP COUNT =", shops.length);

    // 🔥 IMPORTANT: SAFE + COMPATIBLE RESPONSE
    const safeShops = shops.map((s) => ({
      // ORIGINAL FIELDS (KEEP)
      _id: s._id,
      shopName: safeString(s.shopName),
      area: safeString(s.area),
      segment: safeString(s.segment),

      // 🔥 REQUIRED BY OLD FLUTTER
      shopId: s._id,
      shop_name: safeString(s.shopName),
      shopNameDisplay: safeString(s.shopName),

      // 🔥 MAIN CRASH FIX (address must be STRING)
      address: safeString(s.shopAddress),

      // OPTIONAL (safe)
      ownerName: safeString(s.ownerName),
      contactNumber: safeString(s.contactNumber),
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
      area,
      shopAddress,
      ownerName,
      contactNumber,
      latitude,
      longitude,
      segment,
    } = req.body;

    if (!shopName || !area || !segment) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    const shopImage = req.file ? req.file.path : null;

    const shop = await Shop.create({
      shopName,
      area,
      shopAddress,
      ownerName,
      contactNumber,
      latitude,
      longitude,
      segment,
      shopImage,
      isDeleted: false,
    });

    res.json({ success: true, shop });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
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
