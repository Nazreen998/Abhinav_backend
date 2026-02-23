const ddb = require("../config/dynamo");
const {
  ScanCommand,
  PutCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const XLSX = require("xlsx");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const SHOP_TABLE = "abhinav_shops";
const USER_TABLE = "abhinav_users";

// ==============================
// LIST SHOPS (Role Based + Search)
// ==============================
exports.listShops = async (req, res) => {
  try {
    let filterExpression =
      "sk = :profile AND (attribute_not_exists(isDeleted) OR isDeleted = :false)";

    let expressionValues = {
      ":profile": "PROFILE",
      ":false": false,
    };

    let expressionNames = {};

    if (req.user.role === "salesman") {
      filterExpression += " AND createdByUserId = :uid";
      expressionValues[":uid"] = req.user.id;
    } else {
      filterExpression += " AND #status = :approved";
      expressionValues[":approved"] = "approved";
      expressionNames["#status"] = "status";
    }

    // 🔍 Search support
    if (req.query.search) {
      filterExpression += " AND contains(shop_name, :search)";
      expressionValues[":search"] = req.query.search;
    }

    const result = await ddb.send(
      new ScanCommand({
        TableName: SHOP_TABLE,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionValues,
        ExpressionAttributeNames:
          Object.keys(expressionNames).length ? expressionNames : undefined,
      })
    );

    const shops = (result.Items || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ success: true, shops });
  } catch (err) {
    console.error("LIST SHOP ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to fetch shops" });
  }
};

// ==============================
// ADD SHOP
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

    const shop = {
      pk: `SHOP#${shopId}`,
      sk: "PROFILE",
      shop_id: shopId,
      shop_name,
      address: address || "",
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,
      segment,
      status: "pending",
      isDeleted: false,
      shopImage: req.file?.location || req.file?.path || "",
      createdByUserId: req.user?.id || "",
      createdByUserName: req.user?.name || "",
      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: SHOP_TABLE,
        Item: shop,
      })
    );

    res.json({ success: true, shop });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// BULK UPLOAD FROM EXCEL
// ==============================
exports.bulkUploadFromExcel = async (req, res) => {
  try {
    const filePath = path.join(__dirname, "../data/location.xlsx");

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    for (const row of rows) {
      const userResult = await ddb.send(
        new ScanCommand({
          TableName: USER_TABLE,
          FilterExpression: "username = :uname",
          ExpressionAttributeValues: {
            ":uname": row.so_username,
          },
        })
      );

      if (!userResult.Items.length) continue;

      const soUser = userResult.Items[0];
      const shopId = uuidv4();

      const shopItem = {
        pk: `SHOP#${shopId}`,
        sk: "PROFILE",
        shop_id: shopId,
        shop_name: row.shop_name,
        address: row.address,
        region: row.region,
        lat: Number(row.lat) || 0,
        lng: Number(row.lng) || 0,
        segment: row.segment,
        status: "approved", // auto approved
        isDeleted: false,
        shopImage: "",
        createdByUserId: soUser.user_id,
        createdByUserName: soUser.username,
        createdAt: new Date().toISOString(),
      };

      await ddb.send(
        new PutCommand({
          TableName: SHOP_TABLE,
          Item: shopItem,
        })
      );
    }

    res.json({ success: true, message: "Excel upload completed" });
  } catch (error) {
    console.error("EXCEL ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==============================
// APPROVE SHOP
// ==============================
exports.approveShop = async (req, res) => {
  try {
    const shopId = req.params.id;

    await ddb.send(
      new UpdateCommand({
        TableName: SHOP_TABLE,
        Key: { pk: `SHOP#${shopId}`, sk: "PROFILE" },
        UpdateExpression:
          "SET #status = :approved, approvedBy = :by, approvedAt = :at",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":approved": "approved",
          ":by": req.user?.name || "",
          ":at": new Date().toISOString(),
        },
      })
    );

    res.json({ success: true, message: "Shop approved" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// UPDATE SHOP
// ==============================
exports.updateShop = async (req, res) => {
  try {
    const shopId = req.params.id;
    const { shop_name, address, segment, lat, lng } = req.body;

    await ddb.send(
      new UpdateCommand({
        TableName: SHOP_TABLE,
        Key: { pk: `SHOP#${shopId}`, sk: "PROFILE" },
        UpdateExpression:
          "SET shop_name = :shop_name, address = :address, #seg = :segment, lat = :lat, lng = :lng",
        ExpressionAttributeNames: { "#seg": "segment" },
        ExpressionAttributeValues: {
          ":shop_name": shop_name,
          ":address": address,
          ":segment": segment,
          ":lat": Number(lat),
          ":lng": Number(lng),
        },
      })
    );

    res.json({ success: true, message: "Shop updated" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// SOFT DELETE
// ==============================
exports.softDeleteShop = async (req, res) => {
  try {
    const shopId = req.params.id;

    await ddb.send(
      new UpdateCommand({
        TableName: SHOP_TABLE,
        Key: { pk: `SHOP#${shopId}`, sk: "PROFILE" },
        UpdateExpression: "SET isDeleted = :true, deletedAt = :at",
        ExpressionAttributeValues: {
          ":true": true,
          ":at": new Date().toISOString(),
        },
      })
    );

    res.json({ success: true, message: "Shop deleted" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};