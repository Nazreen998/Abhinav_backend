const Shop = require("../models/Shop");

// ⭐ UPDATE SHOP CONTROLLER
exports.updateShop = async (req, res) => {
  try {
    const shopId = req.params.shop_id;

    const { shop_name, address, segment } = req.body;

    const updated = await Shop.findOneAndUpdate(
      { shop_id: shopId },
      {
        shop_name,
        address,
        segment,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    res.json({
      success: true,
      shop: updated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.addShop = async (req, res) => {
    try {
        const {
            shopName,
            area,
            shopAddress,
            ownerName,
            contactNumber,
            latitude,
            longitude
        } = req.body;

        if (!shopName || !area) {
            return res.status(400).json({ message: "Shop name & area needed" });
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
            shopImage,
            createdBy: req.user.role
        });

        res.json({ success: true, shop });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getAllShops = async (req, res) => {
    try {
        const shops = await Shop.find().sort({ createdAt: -1 });
        res.json({ success: true, shops });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.deleteShop = async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await Shop.findOneAndDelete({ shop_id: id });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Shop not found"
            });
        }

        res.json({ success: true, message: "Shop deleted" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

