const AssignedShop = require("../models/AssignedShop");
const VisitLog = require("../models/VisitLog");
const Shop = require("../models/Shop");
const User = require("../models/User");

const safeString = (v) => (v === null || v === undefined ? "" : v);

// 🇮🇳 IST date helper
const getISTDate = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
};

// =================================================
// ASSIGN SHOP (MASTER / MANAGER)
// =================================================
exports.assignShop = async (req, res) => {
  try {
    const { shop_name, salesman_name } = req.body;

    if (!shop_name || !salesman_name) {
      return res.status(400).json({
        success: false,
        message: "shop_name & salesman_name required",
      });
    }

    const shop = await Shop.findOne({ shop_name, isDeleted: false });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const salesman = await User.findOne({
      name: salesman_name,
      role: "salesman",
    });

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: "Salesman not found",
      });
    }

    if (shop.segment !== salesman.segment) {
      return res.status(400).json({
        success: false,
        message: "Segment mismatch",
      });
    }

    const exists = await AssignedShop.findOne({
      shop_name,
      salesman_name,
      status: "active",
    });

    if (exists) {
      return res.json({ success: true });
    }

    const last = await AssignedShop.find({
      salesman_name,
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

      assigned_by_id: req.user.id,
      assigned_by_name: req.user.name,
      assigned_by_role: req.user.role,

      status: "active",
    });

    res.json({ success: true });
  } catch (e) {
    console.error("ASSIGN ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// -------------------------------------------------
// GET ASSIGNED SHOPS (ROLE-WISE)
// -------------------------------------------------
exports.getAssignedShops = async (req, res) => {
  try {
    let filter = { status: "active" };

    if (req.user.role === "salesman") {
      filter.salesman_id = req.user.id;
    }

    if (req.user.role === "manager") {
      filter.segment = req.user.segment;
    }

    const assigned = await AssignedShop.find(filter).sort({ createdAt: -1 });

    const safeAssigned = assigned.map((a) => ({
      _id: a._id,
      shop_id: a.shop_id,
      shop_name: safeString(a.shop_name),
      salesman_id: a.salesman_id,
      salesman_name: safeString(a.salesman_name),
      segment: safeString(a.segment),
      sequence: a.sequence ?? 0,
      assigned_by_id: a.assigned_by_id,
      assigned_by_name: safeString(a.assigned_by_name),
      assigned_by_role: safeString(a.assigned_by_role),
      status: safeString(a.status),
      createdAt: a.createdAt,

      shopId: a._id,
      shopName: safeString(a.shop_name),
    }));

    res.json({
      success: true,
      assigned: safeAssigned,
    });
  } catch (e) {
    console.error("GET ASSIGNED ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// =================================================
// REMOVE ASSIGNED SHOP
// =================================================
exports.removeAssigned = async (req, res) => {
  try {
    const { assign_id } = req.body;

    const doc = await AssignedShop.findById(assign_id);
    if (!doc) {
      return res.status(404).json({ success: false });
    }

    doc.status = "removed";
    doc.updatedAt = getISTDate();
    await doc.save();

    const remaining = await AssignedShop.find({
      salesman_id: doc.salesman_id,
      status: "active",
    }).sort({ sequence: 1 });

    for (let i = 0; i < remaining.length; i++) {
      remaining[i].sequence = i + 1;
      remaining[i].updatedAt = getISTDate();
      await remaining[i].save();
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

// =================================================
// SALESMAN TODAY STATUS (FIXED)
// =================================================
exports.getSalesmanTodayStatus = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const assigned = await AssignedShop.find({
      salesman_id: req.user.id,
      status: "active",
    }).populate("shop_id");

    const visits = await VisitLog.find({
      salesman_name: req.user.name,
       visit_date: today,
    });

    const visited = visits.map((v) => v.shop_name);

    const completed = [];
    const pending = [];

    for (const a of assigned) {
      visited.includes(a.shop_name) ? completed.push(a) : pending.push(a);
    }

    const mapSafe = (arr) =>
      arr.map((a) => ({
        _id: a._id,
        shop_name: safeString(a.shop_name),
        shopId: a._id,
        shopName: safeString(a.shop_name),
        salesman_name: safeString(a.salesman_name),
        segment: safeString(a.segment),
        sequence: a.sequence ?? 0,

        lat: a.shop_id?.lat ?? 0,
        lng: a.shop_id?.lng ?? 0,
      }));

    res.json({
      success: true,
      today: mapSafe(pending),
      pending: mapSafe(pending),
      completed: mapSafe(completed),
    });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

// =================================================
// NEXT SHOPS (🔥 MAIN FIX FOR NEXT SHOP PAGE)
// =================================================
exports.getNextShops = async (req, res) => {
  try {
    const { id } = req.params; // salesman user_id

    const salesman = await User.findOne({ user_id: id });
    if (!salesman) {
      return res.status(404).json({ success: false });
    }

    const assigned = await AssignedShop.find({
      salesman_id: salesman._id,
      status: "active",
    })
      .populate("shop_id")
      .sort({ sequence: 1 });

    const mapSafe = (arr) =>
  arr.map((a) => ({
    _id: a._id,

    shop_id: a.shop_id?.shop_id ?? "",
    shop_name: a.shop_id?.shop_name ?? a.shop_name,
    address: a.shop_id?.address ?? "",

    salesman_name: safeString(a.salesman_name),
    segment: safeString(a.segment),
    sequence: a.sequence ?? 0,

    lat: a.shop_id?.lat ?? 0,
    lng: a.shop_id?.lng ?? 0,
  }));


    res.json({
      success: true,
      shops,
    });
  } catch (e) {
    console.error("NEXT SHOP ERROR:", e);
    res.status(500).json({ success: false });
  }
};
// =================================================
// REORDER ASSIGNED SHOPS (DRAG & DROP)
// =================================================
exports.reorderAssignedShops = async (req, res) => {
  try {
    const { salesman_id, shops } = req.body;

    if (!salesman_id || !Array.isArray(shops)) {
      return res.status(400).json({ success: false });
    }

    for (let i = 0; i < shops.length; i++) {
      await AssignedShop.findByIdAndUpdate(
        shops[i].assign_id,
        {
          sequence: shops[i].sequence,
          updatedAt: getISTDate(),
        },
        { new: true }
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error("REORDER ERROR:", e);
    res.status(500).json({ success: false });
  }
};
// =================================================
// EDIT ASSIGNED SHOP (CHANGE SALESMAN)
// =================================================
exports.editAssignedShop = async (req, res) => {
  try {
    const { assign_id, new_salesman_id } = req.body;

    const doc = await AssignedShop.findById(assign_id);
    if (!doc) {
      return res.status(404).json({ success: false });
    }

    const newSalesman = await User.findById(new_salesman_id);
    if (!newSalesman) {
      return res.status(404).json({ success: false });
    }

    doc.salesman_id = newSalesman._id;
    doc.salesman_name = newSalesman.name;
    doc.updatedAt = getISTDate();

    await doc.save();

    res.json({ success: true });
  } catch (e) {
    console.error("EDIT ASSIGNED ERROR:", e);
    res.status(500).json({ success: false });
  }
};

// =================================================
// RE-ASSIGN REMOVED SHOP
// =================================================
exports.reassignRemovedShop = async (req, res) => {
  try {
    const { assign_id } = req.body;

    const doc = await AssignedShop.findById(assign_id);
    if (!doc) {
      return res.status(404).json({ success: false });
    }

    const last = await AssignedShop.find({
      salesman_id: doc.salesman_id,
      status: "active",
    })
      .sort({ sequence: -1 })
      .limit(1);

    doc.status = "active";
    doc.sequence = last.length ? last[0].sequence + 1 : 1;
    doc.updatedAt = getISTDate();

    await doc.save();

    res.json({ success: true });
  } catch (e) {
    console.error("REASSIGN ERROR:", e);
    res.status(500).json({ success: false });
  }
};
