const ddb = require("../config/dynamo");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "abhinav_visit_history";

exports.saveVisit = async (req, res) => {
  try {
    const { shop_id, shop_name, result } = req.body;

    const salesmanId = req.user.id;
    const salesmanName = req.user.name;

    if (!shop_id) {
      return res.status(400).json({
        success: false,
        message: "shop_id required",
      });
    }

    const now = new Date().toISOString();

    const item = {
      pk: `VISIT#USER#${salesmanId}`,
      sk: `SHOP#${shop_id}#${now}`,

      visit_id: uuidv4(),

      salesmanId,
      salesmanName,

      shop_id,
      shop_name,

      result: result || "matched",

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
    console.error("SAVE VISIT ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.getVisits = async (req, res) => {
  try {
    const salesmanId = req.user.role === "salesman"
      ? req.user.id
      : req.query.salesmanId;

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(pk, :pk)",
        ExpressionAttributeValues: {
          ":pk": `VISIT#USER#${salesmanId}`,
        },
      })
    );

    const visits = result.Items || [];

    res.json({ success: true, visits });
  } catch (e) {
    console.error("GET VISITS ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
