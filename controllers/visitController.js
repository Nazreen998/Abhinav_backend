const ddb = require("../config/dynamo");
const { PutCommand, ScanCommand, GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const SHOP_TABLE = "abhinav_shops";
const TABLE_NAME = "abhinav_visit_history";

// ============================
// DELETE VISIT (MASTER / MANAGER)
// ============================
exports.deleteVisit = async (req, res) => {
  try {
    const { pk, sk } = req.body;
    if (!pk || !sk) {
      return res.status(400).json({
        success: false,
        message: "pk & sk required",
      });
    }

    // ✅ read the visit first (to enforce company/segment rules)
    const visitRes = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
      })
    );

    const visit = visitRes.Item;

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit not found",
      });
    }

    // ✅ company isolation
    if (visit.companyId !== req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden (other company data)",
      });
    }

    const role = (req.user.role || "").toLowerCase();

    // ✅ manager can delete only same segment
    if (role === "manager") {
      const userSeg = (req.user.segment || "").toLowerCase().trim();
      const visitSeg = (visit.segment || "").toLowerCase().trim();

      if (userSeg !== visitSeg) {
        return res.status(403).json({
          success: false,
          message: "Forbidden (other segment visit)",
        });
      }
    }

    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
      })
    );

    res.json({ success: true, message: "Visit deleted" });
  } catch (e) {
    console.error("DELETE VISIT ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
// ============================
// SAVE VISIT (8 DAYS TTL)
// ============================
exports.saveVisit = async (req, res) => {
  try {
    const { shop_id, shop_name, result, distance } = req.body;

    const salesmanId = req.user.id;
    const salesmanName = req.user.name;

    const shopRes = await ddb.send(
      new GetCommand({
        TableName: SHOP_TABLE,
        Key: {
          pk: `SHOP#${shop_id}`,
          sk: "PROFILE",
        },
      })
    );

    const shop = shopRes.Item;

    const now = new Date().toISOString();

    // 🔥 8 DAYS TTL
    const days = 8;
    const expireAt =
      Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;

    const item = {
      pk: `VISIT#USER#${salesmanId}`,
      sk: `SHOP#${shop_id}#${now}`,

      visit_id: uuidv4(),

      salesmanId,
      salesmanName,

      shop_id,
      shop_name,

      companyId: req.user.companyId,
      companyName: req.user.companyName,

      segment: (shop?.segment || "").toLowerCase(),

      result: result || "matched",
      distance: distance || 0,
      status: "completed",

      createdAt: now,

      expireAt, // ✅ TTL field
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    res.json({ success: true });
  } catch (e) {
    console.error("SAVE VISIT ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ============================
// GET VISITS (COMPANY SAFE)
// ============================
exports.getVisits = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();

    let filterExpression = "#companyId = :cid";
    let expressionNames = { "#companyId": "companyId" };
    let expressionValues = { ":cid": req.user.companyId };

    if (role === "salesman") {
      filterExpression += " AND salesmanId = :uid";
      expressionValues[":uid"] = req.user.id;
    }

    if (role === "manager") {
      filterExpression += " AND #segment = :segment";
      expressionNames["#segment"] = "segment";
      expressionValues[":segment"] =
        (req.user.segment || "").toLowerCase();
    }

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
      })
    );

    res.json({
      success: true,
      visits: result.Items || [],
    });
  } catch (e) {
    console.error("GET VISITS ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};