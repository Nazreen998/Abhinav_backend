const ddb = require("../config/dynamo");
const { ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ASSIGN_TABLE = "abhinav_assignments";
const SHOP_TABLE = "abhinav_shops";
const VISIT_TABLE = "abhinav_visit_history"; // ✅ ADD THIS

const todayYMD = () => new Date().toISOString().slice(0, 10);

exports.getNextShop = async (req, res) => {
  try {
    const day = todayYMD();
    const pk = `SALESMAN#USER#${req.user.id}`;

    // ✅ 1. FIRST get assignments
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

    let assignments = (result.Items || []).sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
    );

    // ---------------------------------------------------
    // ✅ 2. REMOVE ALREADY COMPLETED VISITS
    // ---------------------------------------------------
    const visitRes = await ddb.send(
      new ScanCommand({
        TableName: VISIT_TABLE,
        FilterExpression: "pk = :pk AND #res = :match",
        ExpressionAttributeNames: {
          "#res": "result",
        },
        ExpressionAttributeValues: {
          ":pk": `VISIT#USER#${req.user.id}`,
          ":match": "match",
        },
      })
    );

    const visitedShopIds = (visitRes.Items || []).map(v => v.shop_id);

    // ✅ Filter assignments (remove visited)
    assignments = assignments.filter(
      (a) => !visitedShopIds.includes(a.shop_id)
    );

    const finalShops = [];

    // ✅ 3. Fetch shop details (lat/lng)
    for (let assign of assignments) {
      const shopId = assign.shop_id;
      if (!shopId) continue;

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
        shop_id: shopId,
        shop_name: shop.shop_name ?? assign.shop_name ?? "",
        address: shop.address ?? "",
        lat: Number(shop.lat ?? 0),
        lng: Number(shop.lng ?? 0),
        segment: shop.segment ?? "",
      });
    }

    return res.json({
      success: true,
      shops: finalShops,
    });

  } catch (e) {
    console.error("NEXT SHOP ERROR:", e);
    return res.status(500).json({
      success: false,
      error: e.message,
    });
  }
};