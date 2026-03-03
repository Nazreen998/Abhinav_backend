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
// ================= DASHBOARD REPORT =================
exports.getDashboardReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate & endDate required",
      });
    }

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          "createdAt BETWEEN :start AND :end AND isDeleted <> :true",
        ExpressionAttributeValues: {
          ":start": startDate,
          ":end": endDate,
          ":true": true,
        },
      })
    );

    const visits = result.Items || [];

    const totalVisits = visits.length;
    const totalMatch = visits.filter(v => v.result === "match").length;
    const totalMismatch = visits.filter(v => v.result !== "match").length;

    return res.json({
      success: true,
      totalVisits,
      totalMatch,
      totalMismatch,
    });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
