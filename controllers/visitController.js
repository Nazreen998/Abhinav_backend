const VisitLog = require("../models/VisitLog");

exports.saveVisit = async (req, res) => {
  try {
    const { shop_id, shop_name, result } = req.body;

    // 🔥 FROM JWT TOKEN
    const salesman_id = req.user.user_id;
    const salesman_name = req.user.name;

    if (!shop_id) {
      return res.status(400).json({
        success: false,
        message: "shop_id required",
      });
    }

    const now = new Date();

    const visit_date = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const visit_time = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });

    const visit = await VisitLog.create({
      salesman_id,
      salesman_name,
      shop_id,
      shop_name,
      result,
      visit_date,
      visit_time,
      datetime: now,
      status: "completed",
    });

    res.json({ success: true, visit });
  } catch (e) {
    console.error("SAVE VISIT ERROR:", e);
    res.status(500).json({ success: false });
  }
};

exports.getVisits = async (req, res) => {
  const filter =
    req.user.role === "salesman"
      ? { salesman_id: req.user.user_id }
      : {};

  const visits = await VisitLog.find(filter).sort({ datetime: -1 });
  res.json({ success: true, visits });
};
