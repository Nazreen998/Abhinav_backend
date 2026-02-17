const AssignedShop = require("../models/AssignedShop");
const VisitLog = require("../models/VisitLog");
const Shop = require("../models/Shop");
const User = require("../models/User");

const safe = (v) => (v === null || v === undefined ? "" : v);

// ===============================
// ASSIGN SHOP
// ===============================
exports.assignShop = async (req, res) => {
  try {
    const { shop_name, salesman_name } = req.body;

    if (!shop_name || !salesman_name) {
      return res.status(400).json({
        success: false,
        message: "shop_name & salesman_name required",
      });
    }

    const shop = await Shop.findOne({ _id: shop_id,        // 🔥 USE ID
  isDeleted: false, });
    if (!shop) return res.status(404).json({ success: false });

    const salesman = await User.findOne({
      name: salesman_name,
      role: "salesman",
    });
    if (!salesman) return res.status(404).json({ success: false });

    const exists = await AssignedShop.findOne({
      shop_id: shop._id,
      salesman_id: salesman._id,
      status: "active",
    });
    if (exists) return res.json({ success: true });

    const last = await AssignedShop.find({
      salesman_id: salesman._id,
      status: "active",
    })
      .sort({ sequence: -1 })
      .limit(1);

    const nextSeq = last.length ? last[0].sequence + 1 : 1;

    await AssignedShop.create({
      shop_id: shop._id,
      shop_name: shop.shop_name,

      salesman_id: salesman._id,
      salesman_name: salesman.name,

      segment: shop.segment,
      sequence: nextSeq,

      assigned_by_id: req.user._id,
      assigned_by_name: req.user.name,
      assigned_by_role: req.user.role,

      status: "active",
    });

    res.json({ success: true });
  } catch (e) {
    console.error("ASSIGN ERROR:", e);
    res.status(500).json({ success: false });
  }
};

// ===============================
// GET ASSIGNED SHOPS
// ===============================
exports.getAssignedShops = async (req, res) => {
  try {
    let filter = { status: "active" };

    if (req.user.role === "salesman") {
      filter.salesman_id = req.user._id;
    }

    if (req.user.role === "manager") {
      filter.segment = req.user.segment;
    }

    const assigned = await AssignedShop.find(filter).sort({ sequence: 1 });

    const mapped = assigned.map((a) => ({
      _id: a._id,
      shop_id: a.shop_id.toString(),
      shop_name: safe(a.shop_name),

      salesman_id: a.salesman_id.toString(),
      salesman_name: safe(a.salesman_name),

      segment: safe(a.segment),
      sequence: a.sequence ?? 0,
    }));

    res.json({ success: true, assigned: mapped });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

// ===============================
// REMOVE ASSIGNED SHOP
// ===============================
exports.removeAssigned = async (req, res) => {
  try {
    const { assign_id } = req.body;

    const doc = await AssignedShop.findById(assign_id);
    if (!doc) return res.status(404).json({ success: false });

    doc.status = "removed";
    await doc.save();

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

// ===============================
// REORDER SHOPS
// ===============================
exports.reorderAssignedShops = async (req, res) => {
  try {
    const { shops } = req.body;

    for (let i = 0; i < shops.length; i++) {
      await AssignedShop.findByIdAndUpdate(shops[i]._id, {
        sequence: i + 1,
      });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};
