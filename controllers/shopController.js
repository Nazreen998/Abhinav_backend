const Shop = require("../models/Shop");

const safeString = (v) => (v === null || v === undefined ? "" : v);

// ⭐ LIST SHOPS (FIXED & BACKWARD SAFE)
exports.listShops = async (req, res) => {
  try {
    const shops = await Shop.find({
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    }).sort({ createdAt: -1 });

    const safeShops = shops.map((s) => ({
      // 🔑 Mongo ID
      _id: s._id,

      // ✅ OLD + NEW FLUTTER SUPPORT
      shop_id: s.shop_id || s._id.toString(),
      shop_name: safeString(s.shop_name),
      address: safeString(s.address),

      // ✅ MATCH / MAP
      lat: Number(s.lat ?? 0),
      lng: Number(s.lng ?? 0),

      // EXTRA
      segment: safeString(s.segment),

      // backward compatibility
      shopName: safeString(s.shop_name),
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

// ⭐ ADD SHOP (MATCHES SCHEMA)
exports.addShop = async (req, res) => {
  try {
    const {
      shop_name,
      address,
      lat,
      lng,
      segment,
    } = req.body;

    if (!shop_name || !segment) {
      return res.status(400).json({
        success: false,
        message: "shop_name & segment required",
      });
    }

    const shop = await Shop.create({
      shop_id: new Date().getTime().toString(),
      shop_name,
      address: address || "",
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,
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
      shop_name: req.body.shop_name,
      address: req.body.address,
      segment: req.body.segment,
    };

    const shop =
      id.length > 10
        ? await Shop.findByIdAndUpdate(id, update, { new: true })
        : await Shop.findOneAndUpdate({ shop_id: id }, update, { new: true });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ⭐ SOFT DELETE
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
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};
