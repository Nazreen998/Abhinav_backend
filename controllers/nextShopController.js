const ddb = require("../config/dynamo");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");

const TABLE_NAME = "abhinav_assignments";
const todayYMD = () => new Date().toISOString().slice(0, 10);

exports.getNextShop = async (req, res) => {
  try {
    const day = todayYMD();
    const pk = `SALESMAN#${req.user.id}`;

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "pk = :pk AND begins_with(sk, :prefix) AND #st = :active",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": `ASSIGN#${day}#`,
          ":active": "active",
        },
      })
    );

    const shops = (result.Items || []).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

    res.json({ success: true, shops });
  } catch (e) {
    console.error("NEXT SHOP ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
