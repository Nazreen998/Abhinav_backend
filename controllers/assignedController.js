const AssignedShop = require("../models/AssignedShop");
const VisitLog = require("../models/VisitLog");
const Shop = require("../models/Shop");
const User = require("../models/User");

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

    // Find shop
    const shop = await Shop.findOne({ shop_name, isDeleted: false });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // Find salesman
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

    // Segment validation
    if (shop.segment !== salesman.segment) {
      return res.status(400).json({
        success: false,
        message: "Segment mismatch",
      });
    }

    // Duplicate active check
    const exists = await AssignedShop.findOne({
      shop_name,
      salesman_name,
      status: "active",
    });

    if (exists) {
      return res.json({ success: true });
    }

    // Sequence calculation
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

// =================================================
// GET ASSIGNED SHOPS (ROLE BASED)
// =================================================
exports.getAssignedShops = async (req, res) => {
  try {
    let filter = { status: "active" };

    if (req.user.role === "salesman") {
      filter.salesman_id = req.user.id;
    }

    if (req.user.role === "manager") {
      filter.segment = req.user.segment;
    }

    const assigned = await AssignedShop.find(filter).sort({ sequence: 1 });

    res.json({ success: true, assigned });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// =================================================
// REMOVE ASSIGNED SHOP (SOFT DELETE + RESEQUENCE)
// =================================================
exports.removeAssigned = async (req, res) => {
  try {
    const { assign_id } = req.body;

    if (!assign_id) {
      return res.status(400).json({
        success: false,
        message: "assign_id required",
      });
    }

    const doc = await AssignedShop.findById(assign_id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Assigned shop not found",
      });
    }

    doc.status = "removed";
    doc.updatedAt = getISTDate();
    await doc.save();

    // Resequence remaining
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

// =================================================
// EDIT ASSIGNED SHOP (CHANGE SALESMAN)
// =================================================
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
    if (!doc) {
      return res.status(404).json({ success: false });
    }

    const newSalesman = await User.findById(new_salesman_id);
    if (!newSalesman) {
      return res.status(404).json({ success: false });
    }

    if (newSalesman.segment !== doc.segment) {
      return res.status(400).json({
        success: false,
        message: "Segment mismatch",
      });
    }

    const oldSalesmanId = doc.salesman_id;

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

    // Resequence old salesman
    const oldRemaining = await AssignedShop.find({
      salesman_id: oldSalesmanId,
      status: "active",
    }).sort({ sequence: 1 });

    for (let i = 0; i < oldRemaining.length; i++) {
      oldRemaining[i].sequence = i + 1;
      oldRemaining[i].updatedAt = getISTDate();
      await oldRemaining[i].save();
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// =================================================
// REORDER SHOPS (DRAG & DROP)
// =================================================
exports.reorderAssignedShops = async (req, res) => {
  try {
    const { salesman_id, shops } = req.body;

    if (!salesman_id || !Array.isArray(shops)) {
      return res.status(400).json({
        success: false,
        message: "salesman_id & shops[] required",
      });
    }

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

// =================================================
// SALESMAN TODAY STATUS
// =================================================
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
      salesman: salesmanName,
      date: today,
    });

    const visited = visits.map((v) => v.shop_name);

    const completed = [];
    const pending = [];

    for (const a of assigned) {
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
// -------------------------------------------------
// RE-ASSIGN REMOVED SHOP (ACTIVATE AGAIN)
// -------------------------------------------------
exports.reassignRemovedShop = async (req, res) => {
  try {
    const { shop_name, salesman_name } = req.body;

    if (!shop_name || !salesman_name) {
      return res.status(400).json({
        success: false,
        message: "shop_name & salesman_name required",
      });
    }

    // Find salesman
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

    // Find removed assigned shop
    const doc = await AssignedShop.findOne({
      shop_name,
      salesman_id: salesman._id,
      status: "removed",
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Removed shop not found",
      });
    }

    // Get last sequence
    const last = await AssignedShop.find({
      salesman_id: salesman._id,
      status: "active",
    })
      .sort({ sequence: -1 })
      .limit(1);

    const nextSeq = last.length ? last[0].sequence + 1 : 1;

    // Reactivate
    doc.status = "active";
    doc.sequence = nextSeq;
    doc.updatedAt = new Date();
    await doc.save();

    res.json({
      success: true,
      message: "Shop re-assigned successfully",
    });
  } catch (e) {
    console.error("REASSIGN ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
