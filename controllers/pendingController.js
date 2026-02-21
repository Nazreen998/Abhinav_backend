
const generateShopId = require("../helpers/shopIdGenerator");
const ddb = require("../config/dynamo");
const {
  ScanCommand,
  PutCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "abhinav_shops";
// ======================
// SALESMAN → ADD PENDING SHOP
// ======================
exports.add = async (req, res) => {
  try {
    const { shopName, address, latitude, longitude, image } = req.body;

    await PendingShop.create({
      shopName,
      address,
      latitude,
      longitude,
      image,

      salesmanId: req.user.id,
      createdBy: req.user.name,        // 🔥 SALESMAN NAME
      segment: req.user.segment,
      status: "pending",
    });

    res.json({ success: true });
  } catch (err) {
    console.error("ADD PENDING ERROR:", err);
    res.status(500).json({ success: false, message: "Add failed" });
  }
};

// ======================
// MANAGER / MASTER → LIST PENDING
// ======================
exports.listPending = async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "#status = :pending AND isDeleted = :false",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":pending": "pending",
        ":false": false,
      },
    };

    // 🔥 If Manager → filter by segment also
    if (req.user.role === "manager") {
      params.FilterExpression += " AND segment = :segment";
      params.ExpressionAttributeValues[":segment"] = req.user.segment;
    }

    const result = await ddb.send(new ScanCommand(params));

    const shops = result.Items || [];

    // Sort latest first
    shops.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      shops,
    });

  } catch (err) {
    console.error("LIST PENDING ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ======================
// MANAGER / MASTER → APPROVE
// ======================
exports.approve = async (req, res) => {
  try {
    const pending = await PendingShop.findById(req.params.id);

    if (!pending) {
      return res.status(404).json({ success: false });
    }

    const shopId = await generateShopId(); // ✅ ALWAYS UNIQUE

    await Shop.create({
      shop_id: shopId,
      shop_name: pending.shopName,
      address: pending.address,
      lat: pending.latitude,
      lng: pending.longitude,
      segment: pending.segment,
      status: "approved",
      created_by: pending.createdBy,
      image: pending.image || null,
    });

    pending.status = "approved";
    await pending.save();

    res.json({ success: true });
  } catch (err) {
    console.error("APPROVE ERROR:", err);

    // 🔥 duplicate shop_id safety
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate Shop ID, try again",
      });
    }

    res.status(500).json({ success: false });
  }
};

// ======================
// MANAGER / MASTER → REJECT
// ======================
exports.rejectShop = async (req, res) => {
  try {
    const shopId = req.params.id;

    // Check exists
    const existing = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: `SHOP#${shopId}`, sk: "PROFILE" },
      })
    );

    if (!existing.Item) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `SHOP#${shopId}`,
          sk: "PROFILE",
        },
        UpdateExpression:
          "SET #status = :rejected, rejectedBy = :by, rejectedAt = :at",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":rejected": "rejected",
          ":by": req.user?.name || "",
          ":at": new Date().toISOString(),
        },
      })
    );

    res.json({ success: true, message: "Shop rejected successfully" });

  } catch (e) {
    console.error("REJECT SHOP ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
