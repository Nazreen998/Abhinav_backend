const PendingShop = require("../models/PendingShop_temp");
const Shop = require("../models/Shop");
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

    res.json({ success: true, data });
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
      return res.status(404).json({
        success: false,
        message: "Pending shop not found",
      });
    }

    const shopId = await generateShopId();

    await Shop.create({
      shopId: shopId,

      // 🔥 VERY IMPORTANT FIX (schema expects shop_name)
      shop_name: pending.shopName,

      address: pending.address,
      latitude: pending.latitude,
      longitude: pending.longitude,
      image: pending.image,
      segment: pending.segment,

      salesmanId: pending.salesmanId,
      salesmanName: pending.createdBy, // salesman actual name
      approvedBy: req.user.name,
    });

    pending.status = "approved";
    await pending.save();

    res.json({ success: true });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Approval failed",
    });
  }
};

// ======================
// MANAGER / MASTER → REJECT
// ======================
exports.reject = async (req, res) => {
  try {
    await PendingShop.findByIdAndUpdate(req.params.id, {
      status: "rejected",
      rejectReason: req.body.reason,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("REJECT ERROR:", err);
    res.status(500).json({ success: false });
  }
};
