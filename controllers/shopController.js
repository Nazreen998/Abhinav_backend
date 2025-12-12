const Shop = require("../models/Shop");


// LIST SHOPS
exports.listShops = async (req, res) => {
  try {
    // ❌ DO NOT FILTER HERE
    const shops = await Shop.find({});

    console.log("SHOP COUNT =", shops.length);

    res.json({
      success: true,
      shops,
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
      longitude
    } = req.body;

    if (!shopName || !area) {
      return res
        .status(400)
        .json({ success: false, message: "Shop name & area required" });
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
      isDeleted: false
    });

    res.json({ success: true, shop });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ⭐ UPDATE SHOP — WORKS WITH BOTH shop_id AND _id ⭐
exports.updateShop = async (req, res) => {
  try {
    const id = req.params.id; // can be shop_id (S001) or Mongo _id

    let shop;

    // IF ID LOOKS LIKE MongoId → USE findById
    if (id.length > 10) {
      shop = await Shop.findByIdAndUpdate(
        id,
        {
          shop_name: req.body.shopName,
          address: req.body.shopAddress,
          segment: req.body.segment
        },
        { new: true }
      );
    } else {
      // Otherwise assume shop_id (S001, S005...)
      shop = await Shop.findOneAndUpdate(
        { shop_id: id },
        {
          shop_name: req.body.shopName,
          address: req.body.shopAddress,
          segment: req.body.segment
        },
        { new: true }
      );
    }

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

// ⭐ LIST ACTIVE SHOPS
exports.listShops = async (req, res) => {
  try {
    const shops = await Shop.find({ isDeleted: false }).sort({
      createdAt: -1
    });
    res.json({ success: true, shops });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ⭐ SOFT DELETE SHOP
exports.softDeleteShop = async (req, res) => {
  try {
    const id = req.params.id;

    let shop;

    if (id.length > 10) {
      shop = await Shop.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );
    } else {
      shop = await Shop.findOneAndUpdate(
        { shop_id: id },
        { isDeleted: true },
        { new: true }
      );
    }

    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    res.json({
      success: true,
      message: "Shop deleted inside app only"
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
