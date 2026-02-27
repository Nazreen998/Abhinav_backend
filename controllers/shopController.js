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
      "sk = :profile AND #companyId = :cid AND (attribute_not_exists(isDeleted) OR isDeleted = :false)";

    let expressionValues = {
      ":profile": "PROFILE",
      ":false": false,
      ":cid": req.user.companyId,
    };

    let expressionNames = {
      "#companyId": "companyId",
    };

    const role = req.user.role.toLowerCase();

    // 👷 SALESMAN → only own shops
    if (role === "salesman") {
      filterExpression += " AND createdByUserId = :uid";
      expressionValues[":uid"] = req.user.id;
    }

    // 🧑‍💼 MANAGER → segment wise
    else if (role === "manager") {
      filterExpression += " AND #segment = :segment AND #status = :approved";
      expressionValues[":segment"] = req.user.segment;
      expressionValues[":approved"] = "approved";

      expressionNames["#segment"] = "segment";
      expressionNames["#status"] = "status";
    }

    // 👑 MASTER → all company shops
    else if (role === "master") {
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
        ExpressionAttributeNames: expressionNames,
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
    const { shop_name, address, lat, lng, segment, shopImage } = req.body;

    const shopId = uuidv4();

    const shop = {
      pk: `SHOP#${shopId}`,
      sk: "PROFILE",

      shop_id: shopId,
      shop_name,
      address: address || "",
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,

      segment: (segment || "").toLowerCase(),

      status: "pending",
      isDeleted: false,

      // 🔥 ADD THIS (CRITICAL)
      companyId: req.user.companyId,
      companyName: req.user.companyName,

      shopImage: shopImage || "",

      createdByUserId: req.user.id,
      createdByUserName: req.user.name,

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
// BULK UPLOAD FROM EXCEL (SMART UPSERT + IMAGE)
// ==============================
exports.bulkUploadFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel empty / header mismatch",
      });
    }

    let inserted = 0;
    let updated = 0;
    let missingSO = [];

    for (const rawRow of rows) {

      // 🔥 Normalize keys (remove spaces)
      const row = {};
      Object.keys(rawRow).forEach(key => {
        row[key.trim()] = rawRow[key];
      });

      const soName = String(row.so_username || "").trim();

      if (!soName) {
        missingSO.push("EMPTY_SO_USERNAME");
        continue;
      }

      const userResult = await ddb.send(
        new ScanCommand({
          TableName: USER_TABLE,
          FilterExpression: "#name = :uname",
          ExpressionAttributeNames: { "#name": "name" },
          ExpressionAttributeValues: { ":uname": soName },
        })
      );

      if (!userResult.Items || userResult.Items.length === 0) {
        missingSO.push(soName);
        continue;
      }

      const soUser = userResult.Items[0];

      const soId =
        soUser.user_id ||
        (typeof soUser.pk === "string"
          ? soUser.pk.replace("USER#", "")
          : "");

      // 🔎 Duplicate check (company wise)
      const existingShop = await ddb.send(
        new ScanCommand({
          TableName: SHOP_TABLE,
          FilterExpression:
            "sk = :profile AND #companyId = :cid AND shop_name = :name",
          ExpressionAttributeNames: {
            "#companyId": "companyId",
          },
          ExpressionAttributeValues: {
            ":profile": "PROFILE",
            ":cid": req.user.companyId,
            ":name": row.shop_name,
          },
        })
      );

      if (existingShop.Items && existingShop.Items.length > 0) {

        const shop = existingShop.Items[0];

        await ddb.send(
          new UpdateCommand({
            TableName: SHOP_TABLE,
            Key: { pk: shop.pk, sk: "PROFILE" },
            UpdateExpression:
              "SET shop_name = :name, region = :region, address = :address, #segment = :segment, lat = :lat, lng = :lng, createdByUserId = :uid, createdByUserName = :uname",
            ExpressionAttributeNames: {
              "#segment": "segment",
            },
            ExpressionAttributeValues: {
              ":name": row.shop_name,
              ":region": row.region || "",
              ":address": row.address || "",
              ":segment": (row.segment || "").toLowerCase(),
              ":lat": Number(row.lat) || 0,
              ":lng": Number(row.lng) || 0,
              ":uid": soId,
              ":uname": soUser.name,
            },
          })
        );

        updated++;

      } else {

        const shopId = uuidv4();

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
              segment: (row.segment || "").toLowerCase(),
              status: "approved",
              isDeleted: false,
              createdByUserId: soId,
              createdByUserName: soUser.name,
              companyId: req.user.companyId,
              companyName: req.user.companyName,
              createdAt: new Date().toISOString(),
            },
          })
        );

        inserted++;
      }
    }

    return res.json({
      success: true,
      inserted,
      updated,
      missingSO,
    });

  } catch (e) {
    console.error("EXCEL UPLOAD ERROR:", e);
    return res.status(500).json({
      success: false,
      error: e.message,
    });
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