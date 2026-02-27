const ddb = require("../config/dynamo");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const SHOP_TABLE = "abhinav_shops";

const TABLE_NAME = "abhinav_visit_history";

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

    const item = {
      pk: `VISIT#USER#${salesmanId}`,
      sk: `SHOP#${shop_id}#${now}`,

      visit_id: uuidv4(),

      salesmanId,
      salesmanName,

      shop_id,
      shop_name,

      // 🔥 ADD THIS
      companyId: req.user.companyId,
      companyName: req.user.companyName,

      segment: (shop?.segment || "").toLowerCase(),

      result: result || "matched",
      distance: distance || 0,
      status: "completed",

      createdAt: now,
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    res.json({ success: true });

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
exports.getVisits = async (req, res) => {
  try {

    const role = req.user.role.toLowerCase();

    let filterExpression = "#companyId = :cid";

    let expressionNames = {
      "#companyId": "companyId",
    };

    let expressionValues = {
      ":cid": req.user.companyId,
    };

    if (role === "salesman") {
      filterExpression += " AND salesmanId = :uid";
      expressionValues[":uid"] = req.user.id;
    }

    if (role === "manager") {
      filterExpression += " AND #segment = :segment";
      expressionNames["#segment"] = "segment";
      expressionValues[":segment"] =
        req.user.segment.toLowerCase();
    }

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
      })
    );

    res.json({ success: true, visits: result.Items || [] });

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
