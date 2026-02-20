const ddb = require("../config/dynamo");
const { ScanCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "abhinav_assignments";

const pad4 = (n) => String(n).padStart(4, "0");
const todayYMD = () => new Date().toISOString().slice(0, 10);

// ===================================================
// RESET + ASSIGN
// ===================================================
exports.resetAndAssignManual = async (req, res) => {
  try {
    const { salesmanId, salesmanName, shops } = req.body;

    if (!salesmanId || !salesmanName || !Array.isArray(shops) || shops.length === 0) {
      return res.status(400).json({
        success: false,
        message: "salesmanId, salesmanName, shops[] required",
      });
    }

    if (req.user.role === "manager") {
      const invalid = shops.find(
        (s) =>
          (s.segment || "").toLowerCase() !==
          (req.user.segment || "").toLowerCase()
      );

      if (invalid) {
        return res.status(403).json({
          success: false,
          message: "Manager can assign only own segment shops",
        });
      }
    }

    const cleanId = String(salesmanId).replace("USER#", "");
    const pk = `SALESMAN#USER#${cleanId}`;
    const day = todayYMD();

    // ✅ Get existing active assignments count (NO RESET)
    const existing = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          "pk = :pk AND begins_with(sk, :prefix) AND #st = :active",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": `ASSIGN#${day}#`,
          ":active": "active",
        },
      })
    );

    const prevCount = (existing.Items || []).length;

    // 2️⃣ Insert new (Append mode)
    const createdAt = new Date().toISOString();

    for (let i = 0; i < shops.length; i++) {
      const s = shops[i];

      // ✅ Continue sequence
      const seq = prevCount + i + 1;

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            pk,
            sk: `ASSIGN#${day}#${pad4(seq)}`,
            assignment_id: uuidv4(),

            salesmanId: cleanId,
            salesmanName,

            shop_id: s.shop_id,
            shop_name: s.shop_name,
            address: s.address,
            segment: String(s.segment).toLowerCase(),

            sequence: seq,
            mode: "manual",
            status: "active",

            assignedById: req.user.id,
            assignedByName: req.user.name,
            assignedByRole: req.user.role,

            createdAt,
          },
        })
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error("ASSIGN ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
// ===================================================
// LIST ASSIGNED
// ===================================================
exports.listAssigned = async (req, res) => {
  try {
    const day = todayYMD();
    let salesmanId = req.query.salesmanId;

    if (req.user.role === "salesman") {
      salesmanId = req.user.id;
    }

    if (!salesmanId) {
      return res.status(400).json({ success: false });
    }

    const cleanId = String(salesmanId).replace("USER#", "");
    const pk = `SALESMAN#USER#${cleanId}`;

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression:
          "pk = :pk AND begins_with(sk, :prefix) AND #st = :active",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": `ASSIGN#${day}#`,
          ":active": "active",
        },
      })
    );

    const items = (result.Items || []).sort(
      (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
    );

    res.json({ success: true, assigned: items });
  } catch (e) {
    console.error("LIST ASSIGNED ERROR:", e);
    res.status(500).json({ success: false });
  }
};

// ===================================================
// REMOVE
// ===================================================
exports.removeAssigned = async (req, res) => {
  try {
    const { salesmanId, sk } = req.body;

    const cleanId = String(salesmanId).replace("USER#", "");
    const pk = `SALESMAN#USER#${cleanId}`;

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
        UpdateExpression: "SET #st = :removed",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: { ":removed": "removed" },
      })
    );

    res.json({ success: true });
  } catch (e) {
    console.error("REMOVE ERROR:", e);
    res.status(500).json({ success: false });
  }
};

// ===================================================
// REORDER
// ===================================================
exports.reorderAssigned = async (req, res) => {
  try {
    const { salesmanId, order } = req.body;

    const cleanId = String(salesmanId).replace("USER#", "");
    const pk = `SALESMAN#USER#${cleanId}`;

    for (let i = 0; i < order.length; i++) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk, sk: order[i] },
          UpdateExpression: "SET #seq = :seq",
          ExpressionAttributeNames: { "#seq": "sequence" },
          ExpressionAttributeValues: { ":seq": i + 1 },
        })
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error("REORDER ERROR:", e);
    res.status(500).json({ success: false });
  }
};
