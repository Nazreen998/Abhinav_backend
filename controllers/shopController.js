const ddb = require("../config/dynamo");
const {
  ScanCommand,
  PutCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "abhinav_shops";

const safeString = (v) => (v === null || v === undefined ? "" : v);

// ==============================
// LIST SHOPS (master/manager/salesman)
// ==============================
exports.listShops = async (req, res) => {
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          "sk = :profile AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
        ExpressionAttributeValues: {
          ":profile": "PROFILE",
          ":false": false,
        },
      })
    );

    const shops = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const safeShops = shops.map((s) => ({
      // Dynamo keys
      pk: s.pk,
      sk: s.sk,

      // Flutter support
      shop_id: s.shop_id,
      shop_name: safeString(s.shop_name),
      address: safeString(s.address),

      lat: Number(s.lat ?? 0),
      lng: Number(s.lng ?? 0),

      segment: safeString(s.segment),

      // Approval
      isApproved: s.isApproved ?? false,
      approvedBy: safeString(s.approvedBy),
      approvedAt: safeString(s.approvedAt),

      // Created by
      createdByUserId: safeString(s.createdByUserId),
      createdByUserName: safeString(s.createdByUserName),

      // Backward compatibility
      shopName: safeString(s.shop_name),

      createdAt: safeString(s.createdAt),
    }));

    res.json({ success: true, shops: safeShops });
  } catch (err) {
    console.error("LIST SHOP ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
    });
  }
};

// ==============================
// ADD SHOP (salesman/manager)
// ==============================
exports.addShop = async (req, res) => {
  try {
    const { shop_name, address, lat, lng, segment } = req.body;

    if (!shop_name || !segment) {
      return res.status(400).json({
        success: false,
        message: "shop_name & segment required",
      });
    }

    const shopId = uuidv4();

    // If you upload image in multer middleware
    const shopImage =
      req.file?.location || req.file?.path || req.body.shopImage || "";

    const shop = {
      pk: `SHOP#${shopId}`,
      sk: "PROFILE",

      shop_id: shopId,
      shop_name,
      address: address || "",

      lat: Number(lat) || 0,
      lng: Number(lng) || 0,

      segment,

      // approval
      isApproved: false,
      approvedBy: "",
      approvedAt: "",

      // soft delete
      isDeleted: false,

      // image
      shopImage,

      // created by
      createdByUserId: req.user?.id || "",
      createdByUserName: req.user?.name || "",

      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: shop,
      })
    );

    res.json({ success: true, shop });
  } catch (e) {
    console.error("ADD SHOP ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// APPROVE SHOP (manager/master)
// ==============================
exports.approveShop = async (req, res) => {
  try {
    const shopId = req.params.id;

    // check exists
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
          "SET isApproved = :true, approvedBy = :by, approvedAt = :at",
        ExpressionAttributeValues: {
          ":true": true,
          ":by": req.user?.name || "",
          ":at": new Date().toISOString(),
        },
      })
    );

    res.json({ success: true, message: "Shop approved successfully" });
  } catch (e) {
    console.error("APPROVE SHOP ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// UPDATE SHOP (manager/master)
// ==============================
exports.updateShop = async (req, res) => {
  try {
    const shopId = req.params.id;

    const { shop_name, address, segment, lat, lng } = req.body;

    // check exists
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
          "SET shop_name = :shop_name, address = :address, segment = :segment, lat = :lat, lng = :lng",
        ExpressionAttributeValues: {
          ":shop_name": shop_name ?? existing.Item.shop_name,
          ":address": address ?? existing.Item.address,
          ":segment": segment ?? existing.Item.segment,
          ":lat": Number(lat ?? existing.Item.lat ?? 0),
          ":lng": Number(lng ?? existing.Item.lng ?? 0),
        },
      })
    );

    res.json({ success: true, message: "Shop updated successfully" });
  } catch (e) {
    console.error("UPDATE SHOP ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// SOFT DELETE SHOP (master only)
// ==============================
exports.softDeleteShop = async (req, res) => {
  try {
    const shopId = req.params.id;

    // check exists
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
        UpdateExpression: "SET isDeleted = :true, deletedAt = :at",
        ExpressionAttributeValues: {
          ":true": true,
          ":at": new Date().toISOString(),
        },
      })
    );

    res.json({ success: true, message: "Shop deleted successfully" });
  } catch (e) {
    console.error("DELETE SHOP ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
