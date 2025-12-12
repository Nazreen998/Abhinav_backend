const AssignedShop = require("../models/AssignedShop");
const VisitLog = require("../models/VisitLog");

// 🇮🇳 IST helper
const getISTDate = () => {
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
};

// -------------------------------------------------
// ASSIGN SHOP
// -------------------------------------------------
exports.assignShop = async (req, res) => {
  console.log("🔥 ASSIGN API HIT");
  console.log("BODY =>", req.body);
  console.log("USER =>", req.user);
  try {
    const { shop_name, salesman_name, segment } = req.body;

    if (!shop_name || !salesman_name) {
      return res.status(400).json({
        success: false,
        message: "shop_name and salesman_name required",
      });
    }

    // prevent duplicate
    const exists = await AssignedShop.findOne({ shop_name, salesman_name });
    if (exists) return res.json({ success: true });

    // auto sequence
    const last = await AssignedShop.find({ salesman_name })
      .sort({ sequence: -1 })
      .limit(1);

    const nextSeq = last.length ? last[0].sequence + 1 : 1;

  await AssignedShop.create({
  shop_name,
  salesman_name,
  segment,
  sequence: nextSeq,
  assigned_by: req.user.name,
  assigned_by_role:
    req.user.role === "manager" || req.user.role === "master"
      ? req.user.role
      : "master", // 🔥 fallback
});

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// -------------------------------------------------
// GET ASSIGNED SHOPS
// -------------------------------------------------
exports.getAssignedShops = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "salesman") {
      filter.salesman_name = req.user.name;
    }

    const assigned = await AssignedShop.find(filter).sort({ sequence: 1 });
    res.json({ success: true, assigned });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// -------------------------------------------------
// REMOVE ASSIGNED SHOP + RESEQUENCE
// -------------------------------------------------
exports.removeAssigned = async (req, res) => {
  try {
    const { shop_name, salesman_name } = req.body;

    await AssignedShop.findOneAndDelete({ shop_name, salesman_name });

    const remaining = await AssignedShop.find({ salesman_name }).sort({ sequence: 1 });

    for (let i = 0; i < remaining.length; i++) {
      remaining[i].sequence = i + 1;
      await remaining[i].save();
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// -------------------------------------------------
// REORDER ASSIGNED SHOPS (DRAG)
// -------------------------------------------------
exports.reorderAssignedShops = async (req, res) => {
  try {
    const { salesman_name, shops } = req.body;

    for (let s of shops) {
      await AssignedShop.findOneAndUpdate(
        { salesman_name, shop_name: s.shop_name },
        { sequence: s.sequence, updatedAt: getISTDate() }
      );
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ------------------------------------------------
// SALESMAN TODAY / COMPLETED / PENDING
// ------------------------------------------------
exports.getSalesmanTodayStatus = async (req, res) => {
  try {
    const salesmanName = req.user.name;

    const today = new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const assigned = await AssignedShop.find({ salesman_name: salesmanName })
      .sort({ sequence: 1 });

    const visits = await VisitLog.find({
      salesman: salesmanName,
      date: today,
    });

    const visited = visits.map(v => v.shop_name);

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
