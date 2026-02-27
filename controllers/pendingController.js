const ddb = require("../config/dynamo");
const {
  ScanCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "abhinav_shops";


// ======================
// MANAGER / MASTER → LIST PENDING
// ======================
exports.listPending = async (req, res) => {
  try {

    const role = (req.user.role || "").toLowerCase();

    let filterExpression =
      "#status = :pending AND #isDeleted = :false AND #companyId = :cid";

    let expressionAttributeNames = {
      "#status": "status",
      "#isDeleted": "isDeleted",
      "#companyId": "companyId",
    };

    let expressionAttributeValues = {
      ":pending": "pending",
      ":false": false,
      ":cid": req.user.companyId,
    };

    // Manager → segment wise
    if (role === "manager") {
      filterExpression += " AND #segment = :segment";
      expressionAttributeNames["#segment"] = "segment";
      expressionAttributeValues[":segment"] =
        (req.user.segment || "").toLowerCase().trim();
    }

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    res.json({
      success: true,
      shops: result.Items || [],
    });

  } catch (err) {
    console.error("LIST PENDING ERROR:", err);
    res.status(500).json({ success: false });
  }
};


// ======================
// APPROVE SHOP
// ======================
exports.approve = async (req, res) => {
  try {

    const shopId = req.params.id;

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `SHOP#${shopId}`,
          sk: "PROFILE",
        },
        UpdateExpression:
          "SET #status = :approved, approvedBy = :by, approvedAt = :at",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":approved": "approved",
          ":by": req.user.name,
          ":at": new Date().toISOString(),
        },
      })
    );

    res.json({ success: true });

  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({ success: false });
  }
};


// ======================
// REJECT SHOP
// ======================
exports.rejectShop = async (req, res) => {
  try {

    const shopId = req.params.id;

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
          ":by": req.user.name,
          ":at": new Date().toISOString(),
        },
      })
    );

    res.json({ success: true });

  } catch (e) {
    console.error("REJECT SHOP ERROR:", e);
    res.status(500).json({ success: false });
  }
};