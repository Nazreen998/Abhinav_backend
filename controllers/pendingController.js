
const generateShopId = require("../helpers/shopIdGenerator");

// ======================
// SALESMAN → ADD PENDING SHOP
// ======================
exports.add = async (req, res) => {
  try {
    const { shopName, address, latitude, longitude, image } = req.body;

    await PendingShop.create({
      shopName,
      address,
      latitude,
      longitude,
      image,

      salesmanId: req.user.id,
      createdBy: req.user.name,        // 🔥 SALESMAN NAME
      segment: req.user.segment,
      status: "pending",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ADD PENDING ERROR:", err);
    res.status(500).json({ success: false, message: "Add failed" });
  }
};

// ======================
// MANAGER / MASTER → LIST PENDING
// ======================
exports.listPending = async (req, res) => {
  try {
    let filter = { status: "pending" };

    if (req.user.role === "manager") {
      filter.segment = req.user.segment;
    }

    const data = await PendingShop.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, data, shops: data });
  } catch (err) {
    console.error("LIST PENDING ERROR:", err);
    res.status(500).json({ success: false });
  }
};

// ======================
// MANAGER / MASTER → APPROVE
// ======================
exports.approve = async (req, res) => {
  try {
    const pending = await PendingShop.findById(req.params.id);

    if (!pending) {
      return res.status(404).json({ success: false });
    }

    const shopId = await generateShopId(); // ✅ ALWAYS UNIQUE

    await Shop.create({
      shop_id: shopId,
      shop_name: pending.shopName,
      address: pending.address,
      lat: pending.latitude,
      lng: pending.longitude,
      segment: pending.segment,
      status: "approved",
      created_by: pending.createdBy,
      image: pending.image || null,
    });

    pending.status = "approved";
    await pending.save();

    res.json({ success: true });
  } catch (err) {
    console.error("APPROVE ERROR:", err);

    // 🔥 duplicate shop_id safety
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate Shop ID, try again",
      });
    }

    res.status(500).json({ success: false });
  }
};

// ======================
// MANAGER / MASTER → REJECT
// ======================
exports.reject = async (req, res) => {
  try {
    const { shop_id } = req.params;

    const result = await PendingShop.deleteOne({
      shop_id: shop_id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("REJECT ERROR:", err);
    res.status(500).json({ success: false });
  }
};
