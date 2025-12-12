const PendingShop = require("../models/PendingShop_temp");
const Shop = require("../models/Shop");
// Generate shop ID
const generateShopId = require("../helpers/shopIdGenerator");

exports.approve = async (req, res) => {
  const pending = await PendingShop.findById(req.params.id);
  if (!pending) return res.status(404).json({ message: "Not found" });

  const shopId = await generateShopId(); // 🔥 FIX

  await Shop.create({
    shopId, // ✅ AUTO GENERATED
    shopName: pending.shopName,
    address: pending.address,
    latitude: pending.latitude,
    longitude: pending.longitude,
    image: pending.image,
    segment: pending.segment,
    salesmanId: pending.salesmanId,
    approvedBy: req.user.id,
  });

  pending.status = "approved";
  await pending.save();

  res.json({ success: true });
};


// ======================
// SALESMAN → ADD
// ======================
exports.add = async (req, res) => {
  const { shopName, address, latitude, longitude, image } = req.body;

 await PendingShop.create({
  salesmanId: req.user.id,
  createdBy: req.user.name, // ✅ ADD THIS
  shopName,
  address,
  latitude,
  longitude,
  image,
  segment: req.user.segment,
  status: "pending",
});


  res.json({ success: true });
};

// ======================
// MANAGER / MASTER → VIEW PENDING
// ======================
exports.listPending = async (req, res) => {
  let filter = { status: "pending" };

  // MANAGER → segment wise
  if (req.user.role === "manager") {
    filter.segment = req.user.segment;
  }

  // MASTER → no segment filter (see all)

  const data = await PendingShop.find(filter).sort({ createdAt: -1 });

  res.json({ success: true, data });
};

// ======================
// MANAGER → APPROVE
// ======================
exports.approve = async (req, res) => {
  const pending = await PendingShop.findById(req.params.id);
  if (!pending) return res.status(404).json({ message: "Not found" });

  // MOVE TO SHOPS
  await Shop.create({
    shopName: pending.shopName,
    address: pending.address,
    latitude: pending.latitude,
    longitude: pending.longitude,
    image: pending.image,
    segment: pending.segment,
    salesmanId: pending.salesmanId,
    approvedBy: req.user.id,
  });

  pending.status = "approved";
  await pending.save();

  res.json({ success: true });
};

// ======================
// MANAGER → REJECT
// ======================
exports.reject = async (req, res) => {
  await PendingShop.findByIdAndUpdate(req.params.id, {
    status: "rejected",
    rejectReason: req.body.reason,
  });

  res.json({ success: true });
};
