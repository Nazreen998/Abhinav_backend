const ddb = require("../config/dynamo");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "abhinav_visit_history";

exports.getHistory = async (req, res) => {
  try {
    let result;

    if (req.user.role === "salesman") {
      result = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "pk = :pk",
          ExpressionAttributeValues: {
            ":pk": `VISIT#USER#${req.user.id}`,
          },
        })
      );
    } else {
      // master / manager → see all
      result = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
        })
      );
    }

    const logs = result.Items || [];

    logs.sort((a, b) =>
      new Date(b.createdAt).compareTo(new Date(a.createdAt))
    );

    res.json({
      success: true,
      logs,
    });
  } catch (e) {
    console.error("HISTORY ERROR:", e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
