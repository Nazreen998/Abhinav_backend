const History = require("../models/History");

exports.getHistory = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "salesman") {
      filter.salesmanName = req.user.name;
    }

    const history = await History.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      logs: history,   // ✅ Flutter-friendly
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
