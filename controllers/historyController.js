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

// Master & Manager → dashboard report
exports.getDashboardReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate & endDate required",
      });
    }

    const companyId = req.user.companyId;
    const role = req.user.role?.toLowerCase();
    const userSegment = req.user.segment;

    // 🔍 Scan by company (optimize later with GSI if needed)
    const scanRes = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          "companyId = :cid AND (attribute_not_exists(isDeleted) OR isDeleted = :false)",
        ExpressionAttributeValues: {
          ":cid": companyId,
          ":false": false,
        },
      })
    );

    let logs = scanRes.Items || [];

    // 🔒 Manager segment restriction
    if (role === "manager") {
      logs = logs.filter(
        (l) => (l.segment || "").toLowerCase() === userSegment.toLowerCase()
      );
    }

    // 📅 Filter by date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    logs = logs.filter((l) => {
      if (!l.createdAt) return false;
      const dt = new Date(l.createdAt);
      return dt >= start && dt <= end;
    });

    // 📊 Aggregation
    let totalVisits = logs.length;
    let totalMatch = 0;
    let totalMismatch = 0;

    const salesmanMap = {};
    const dailyMap = {};

    logs.forEach((l) => {
      const isMatch = l.result === "match";

      if (isMatch) totalMatch++;
      else totalMismatch++;

      const name = l.salesmanName || "Unknown";

      // Salesman grouping
      if (!salesmanMap[name]) {
        salesmanMap[name] = { name, visits: 0, match: 0 };
      }

      salesmanMap[name].visits++;
      if (isMatch) salesmanMap[name].match++;

      // Daily grouping
      const date = l.createdAt.split("T")[0];

      if (!dailyMap[date]) {
        dailyMap[date] = { date, visits: 0 };
      }

      dailyMap[date].visits++;
    });

    const activeReps = Object.keys(salesmanMap).length;
    const matchPercent =
      totalVisits === 0 ? 0 : Math.round((totalMatch / totalVisits) * 100);

    const avgPerRep =
      activeReps === 0 ? 0 : (totalVisits / activeReps).toFixed(1);

    const salesmanPerformance = Object.values(salesmanMap).sort(
      (a, b) => b.visits - a.visits
    );

    const dailyTrend = Object.values(dailyMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return res.json({
      success: true,
      totalVisits,
      totalMatch,
      totalMismatch,
      matchPercent,
      activeReps,
      avgPerRep,
      dailyTrend,
      salesmanPerformance,
    });
  } catch (e) {
    console.error("DASHBOARD ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
};

