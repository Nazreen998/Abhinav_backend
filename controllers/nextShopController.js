const ddb = require("../config/dynamo");
const { ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ASSIGN_TABLE = "abhinav_assignments";
const SHOP_TABLE = "abhinav_shops";

const todayYMD = () => new Date().toISOString().slice(0, 10);

exports.getNextShop = async (req, res) => {
  try {
    const day = todayYMD();
    const pk = `SALESMAN#${req.user.id}`;

    // 1️⃣ Get today's active assignments
    const result = await ddb.send(
      new ScanCommand({
        TableName: ASSIGN_TABLE,
        FilterExpression:
          "pk = :pk AND begins_with(sk, :prefix) AND #st = :active",
        ExpressionAttributeNames: {
          "#st": "status",
        },
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": `ASSIGN#${day}#`,
          ":active": "active",
        },
      })
    );

    const assignments = (result.Items || []).sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
    );

    const finalShops = [];

    // 2️⃣ Fetch lat/lng from shop table
    for (let assign of assignments) {
      const shopId = assign.shop_id; // 🔥 MUST exist

      if (!shopId) {
        continue;
      }

      const shopRes = await ddb.send(
        new GetCommand({
          TableName: SHOP_TABLE,
          Key: {
            pk: `SHOP#${shopId}`,
            sk: "PROFILE",
          },
        })
      );

      const shop = shopRes.Item;

      if (!shop) continue;

      finalShops.push({
        ...assign,
        address: shop.address ?? "",
        lat: Number(shop.lat ?? 0),
        lng: Number(shop.lng ?? 0),
        segment: shop.segment ?? "",
      });
    }

    res.json({
      success: true,
      shops: finalShops,
    });
  } catch (e) {
    console.error("NEXT SHOP ERROR:", e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};
