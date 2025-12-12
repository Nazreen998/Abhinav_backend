const PendingShop = require("../models/PendingShop");

exports.addPendingShop = async (req, res) => {
  try {
    const {
      salesmanId,
      shopName,
      address,
      latitude,
      longitude,
      image,
      segment,
    } = req.body;

    if (
      !salesmanId ||
      !shopName ||
      !address ||
      !latitude ||
      !longitude ||
      !image ||
      !segment
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    await PendingShop.create({
      salesmanId,
      shopName,
      address,
      latitude,
      longitude,
      image,
      segment, // must be fmcg / pipes
    });

    res.json({
      success: true,
      message: "Shop submitted for approval",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      message: e.message,
    });
  }
};
