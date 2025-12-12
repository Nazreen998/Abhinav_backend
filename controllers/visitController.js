const VisitLog = require("../models/VisitLog");

// --------------------------------------
// SAVE VISIT
// --------------------------------------
exports.saveVisit = async (req, res) => {
  try {
    const {
      salesman_name,
      salesman_id,
      shop_name,
      shop_id,
      visit_date,
      visit_time,
      datetime,
      photo_url,
      distance,
      result,
    } = req.body;

    const visit = await VisitLog.create({
      salesman_name,
      salesman_id,
      shop_name,
      shop_id,
      visit_date,
      visit_time,
      datetime,
      photo_url,
      distance,
      result,
      status: "completed",
    });

    res.json({ success: true, visit });
  } catch (e) {
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
// TODAY / PENDING / COMPLETED
// --------------------------------------
exports.getVisitByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const filter = { status };
    if (req.user.role === "salesman") {
      filter.salesman_id = req.user.user_id;
    }

    const visits = await VisitLog.find(filter).sort({ datetime: -1 });
    res.json({ success: true, visits });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
