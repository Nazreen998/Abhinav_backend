const VisitLog = require("../models/VisitLog");

// --------------------------------------
// SAVE VISIT (FINAL FIXED)
// --------------------------------------
exports.saveVisit = async (req, res) => {
  try {
    const {
      salesman_id,
      salesman_name,
      shop_id,
      shop_name,
      photo_url,
      distance,
      result,
      segment,
      lat,
      lng,
      visit_time,
    } = req.body;

    if (!salesman_id || !shop_id) {
      return res.status(400).json({
        success: false,
        message: "salesman_id & shop_id required",
      });
    }

    const now = new Date();
    const visit_date = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const visit = await VisitLog.create({
      salesman_id,
      salesman_name,
      shop_id,
      shop_name,
      photo_url,
      distance,
      result,
      segment,
      lat,
      lng,
      visit_time: visit_time || now.toISOString(),
      visit_date,
      datetime: now,
      status: "completed",
    });

    res.json({ success: true, visit });
  } catch (e) {
    console.error("SAVE VISIT ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// --------------------------------------
// GET VISITS (ROLE BASED)
// --------------------------------------
exports.getVisits = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "salesman") {
      filter.salesman_id = req.user.user_id;
    }

    const visits = await VisitLog.find(filter).sort({ datetime: -1 });

    res.json({ success: true, visits });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// --------------------------------------
// STATUS FILTER
// --------------------------------------
exports.getVisitByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    let filter = { status };

    if (req.user.role === "salesman") {
      filter.salesman_id = req.user.user_id;
    }

    const visits = await VisitLog.find(filter).sort({ datetime: -1 });
    res.json({ success: true, visits });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
