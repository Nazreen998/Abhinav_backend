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
    const { shop_name, address, lat, lng, segment,shopImage } = req.body;

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
      // ✅ SAVE BASE64 DIRECTLY
      shopImage: shopImage || "",
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
    if (!req.file?.path) {
      return res.status(400).json({ success: false, message: "Excel file required" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log("Rows count:", rows.length);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: "Excel empty / header mismatch" });
    }

    let inserted = 0;
    let missingSO = [];

    for (const row of rows) {
      const soName = String(row.so_username || "").trim();

      const userResult = await ddb.send(
        new ScanCommand({
          TableName: USER_TABLE,
          FilterExpression: "username = :uname OR #name = :uname",
          ExpressionAttributeNames: { "#name": "name" },
          ExpressionAttributeValues: { ":uname": soName },
        })
      );

      if (!userResult.Items?.length) {
        missingSO.push(soName);
        continue;
      }

      const soUser = userResult.Items[0];
      const shopId = uuidv4();
const soId =
  soUser.user_id ||
  soUser.id ||
  (typeof soUser.pk === "string"
    ? soUser.pk.replace("USER#", "")
    : "");

      await ddb.send(
        new PutCommand({
          TableName: SHOP_TABLE,
          Item: {
            pk: `SHOP#${shopId}`,
            sk: "PROFILE",
            shop_id: shopId,
            shop_name: row.shop_name,
            address: row.address || "",
            region: row.region || "",
            lat: Number(row.lat) || 0,
            lng: Number(row.lng) || 0,
            segment: row.segment || "",
            status: "approved",
            isDeleted: false,
            shopImage: "",
createdByUserId: soId,
createdByUserName: soUser.username || soUser.name || row.so_username,
            createdAt: new Date().toISOString(),
          },
        })
      );

      inserted++;
    }

    return res.json({
      success: true,
      message: "Excel upload completed",
      inserted,
      missingSO,
    });
  } catch (e) {
    console.error("EXCEL UPLOAD ERROR:", e);
    return res.status(500).json({ success: false, error: e.message });
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

    let updateExp =
      "SET shop_name = :shop_name, address = :address, #seg = :segment";

    const attrNames = { "#seg": "segment" };

    const attrValues = {
      ":shop_name": shop_name,
      ":address": address,
      ":segment": segment,
    };

    // ✅ Only update lat/lng if provided
    if (lat !== undefined && lng !== undefined) {
      updateExp += ", lat = :lat, lng = :lng";
      attrValues[":lat"] = Number(lat);
      attrValues[":lng"] = Number(lng);
    }

    await ddb.send(
      new UpdateCommand({
        TableName: SHOP_TABLE,
        Key: { pk: `SHOP#${shopId}`, sk: "PROFILE" },
        UpdateExpression: updateExp,
        ExpressionAttributeNames: attrNames,
        ExpressionAttributeValues: attrValues,
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

// ==============================
// UPDATE SHOP IMAGE
// ==============================
exports.updateShopImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { shopImage } = req.body;

    if (!shopImage) {
      return res.status(400).json({
        success: false,
        message: "shopImage required",
      });
    }

    await ddb.send(
      new UpdateCommand({
        TableName: SHOP_TABLE,
        Key: {
          pk: `SHOP#${id}`,
          sk: "PROFILE",
        },
        UpdateExpression: "SET shopImage = :img",
        ExpressionAttributeValues: {
          ":img": shopImage,
        },
      })
    );

    res.json({
      success: true,
      message: "Shop image updated successfully",
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};