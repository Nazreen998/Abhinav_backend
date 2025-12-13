const AssignedShop = require("../models/AssignedShop");
const VisitLog = require("../models/VisitLog");
const Shop = require("../models/Shop");
const User = require("../models/User");

// 🇮🇳 IST helper
const getISTDate = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
};

// -------------------------------------------------
// ASSIGN SHOP
// -------------------------------------------------
exports.assignShop = async (req, res) => {
  try {
    const { shop_name, salesman_name, segment } = req.body;

    if (!shop_name || !salesman_name || !segment) {
      return res.status(400).json({
        success: false,
        message: "shop_name, salesman_name, segment required",
      });
    }

    // 🔎 Find shop by name
    const shop = await Shop.findOne({ shop_name, isDeleted: false });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // 🔎 Find salesman by name
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

    // 🔥 Segment validation (IMPORTANT)
    if (shop.segment !== salesman.segment) {
      return res.status(400).json({
        success: false,
        message: "Segment mismatch",
      });
    }

    // 🔁 Duplicate active check
    const exists = await AssignedShop.findOne({
      shop_id: shop._id,
      salesman_id: salesman._id,
      status: "active",
    });

    if (exists) {
      return res.json({ success: true });
    }

    // 🔢 Sequence calculation
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

      assigned_by_id: req.user.id,
      assigned_by_name: req.user.name,
      assigned_by_role: req.user.role,

      status: "active",
    });

    res.json({ success: true });
  } catch (e) {
    console.error(e);
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

    // Manager sees only their segment
    if (req.user.role === "manager") {
      filter.segment = req.user.segment;
    }

    const assigned = await AssignedShop.find(filter).sort({ sequence: 1 });
    res.json({ success: true, assigned });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// -------------------------------------------------
// REMOVE ASSIGNED SHOP (SOFT DELETE) + RESEQUENCE
// -------------------------------------------------
exports.removeAssigned = async (req, res) => {
  try {
    const { assign_id } = req.body;
    if (!assign_id) {
      return res.status(400).json({ success: false, message: "assign_id required" });
    }

    const doc = await AssignedShop.findById(assign_id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    // soft delete
    doc.status = "removed";
    doc.updatedAt = getISTDate();
    await doc.save();

    // resequence remaining active shops for that salesman
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
    res.status(500).json({ success: false, error: e.message });
  }
};

// -------------------------------------------------
// EDIT ASSIGNED SHOP (Change salesman) + RESEQUENCE BOTH
// -------------------------------------------------
exports.editAssignedShop = async (req, res) => {
  try {
    const { assign_id, new_salesman_id } = req.body;

    if (!assign_id || !new_salesman_id) {
      return res.status(400).json({
        success: false,
        message: "assign_id & new_salesman_id required",
      });
    }

    const doc = await AssignedShop.findById(assign_id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    const newSalesman = await User.findById(new_salesman_id);
    if (!newSalesman) {
      return res.status(404).json({ success: false, message: "Salesman not found" });
    }

    // segment check
    if (newSalesman.segment !== doc.segment) {
      return res.status(400).json({ success: false, message: "Segment mismatch" });
    }

    const oldSalesmanId = doc.salesman_id;

    // new sequence for new salesman
    const last = await AssignedShop.find({
      salesman_id: newSalesman._id,
      status: "active",
    })
      .sort({ sequence: -1 })
      .limit(1);

    const nextSeq = last.length ? last[0].sequence + 1 : 1;

    doc.salesman_id = newSalesman._id;
    doc.salesman_name = newSalesman.name;
    doc.sequence = nextSeq;
    doc.updatedAt = getISTDate();
    await doc.save();

    // resequence old salesman list
    const remainingOld = await AssignedShop.find({
      salesman_id: oldSalesmanId,
      status: "active",
    }).sort({ sequence: 1 });

    for (let i = 0; i < remainingOld.length; i++) {
      remainingOld[i].sequence = i + 1;
      remainingOld[i].updatedAt = getISTDate();
      await remainingOld[i].save();
    }

    res.json({ success: true, message: "Updated" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// -------------------------------------------------
// REORDER ASSIGNED SHOPS (DRAG) - salesman wise
// -------------------------------------------------
exports.reorderAssignedShops = async (req, res) => {
  try {
    const { salesman_id, shops } = req.body;

    if (!salesman_id || !Array.isArray(shops)) {
      return res.status(400).json({
        success: false,
        message: "salesman_id & shops[] required",
      });
    }

    // shops = [{ assign_id, sequence }]
    for (const s of shops) {
      await AssignedShop.findOneAndUpdate(
        { _id: s.assign_id, salesman_id, status: "active" },
        { sequence: s.sequence, updatedAt: getISTDate() }
      );
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ------------------------------------------------
// SALESMAN TODAY / COMPLETED / PENDING (ID BASED)
// ------------------------------------------------
exports.getSalesmanTodayStatus = async (req, res) => {
  try {
    const salesmanId = req.user.id;
    const salesmanName = req.user.name;

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const assigned = await AssignedShop.find({
      salesman_id: salesmanId,
      status: "active",
    }).sort({ sequence: 1 });

    const visits = await VisitLog.find({
      salesman: salesmanName, // VisitLog still name-based (ok for now)
      date: today,
    });

    const visited = visits.map((v) => v.shop_name);

    const completed = [];
    const pending = [];

    for (let a of assigned) {
      visited.includes(a.shop_name) ? completed.push(a) : pending.push(a);
    }

    res.json({
      success: true,
      today: pending,
      pending,
      completed,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
