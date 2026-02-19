const ddb = require("../config/dynamo");
const { ScanCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "abhinav_assignments";

const pad4 = (n) => String(n).padStart(4, "0");
const todayYMD = () => new Date().toISOString().slice(0, 10);

// ===============================
// MANAGER/MASTER -> RESET + ASSIGN (MANUAL)
// Body:
// {
//   "salesmanId": "uuid",
//   "salesmanName": "Kumar",
//   "shops": [
//      {"shop_name":"AAA", "address":"Chennai", "segment":"pipes"},
//      {"shop_name":"BBB", "address":"Chennai", "segment":"pipes"}
//   ]
// }
// ===============================
exports.resetAndAssignManual = async (req, res) => {
  try {
    const { salesmanId, salesmanName, shops } = req.body;

    if (!salesmanId || !salesmanName || !Array.isArray(shops) || shops.length === 0) {
      return res.status(400).json({
        success: false,
        message: "salesmanId, salesmanName, shops[] required",
      });
    }

    // ✅ segment safety: manager can assign only own segment
    if (req.user.role === "manager") {
      const invalid = shops.find((s) => (s.segment || "").toLowerCase() !== (req.user.segment || "").toLowerCase());
      if (invalid) {
        return res.status(403).json({
          success: false,
          message: "Manager can assign only own segment shops",
        });
      }
    }

    const pk = `SALESMAN#${salesmanId}`;
    const day = todayYMD();

    // 1) Reset: mark previous ACTIVE for today as REMOVED
    const prev = await ddb.send(
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

    const prevItems = prev.Items || [];
    for (const it of prevItems) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk: it.pk, sk: it.sk },
          UpdateExpression: "SET #st = :removed, removedAt = :at",
          ExpressionAttributeNames: { "#st": "status" },
          ExpressionAttributeValues: {
            ":removed": "removed",
            ":at": new Date().toISOString(),
          },
        })
      );
    }

    // 2) Insert new assignments with sequence
    const createdAt = new Date().toISOString();
    for (let i = 0; i < shops.length; i++) {
      const s = shops[i] || {};
      if (!s.shop_name || !s.address || !s.segment) {
        return res.status(400).json({
          success: false,
          message: "Each shop must have shop_name, address, segment",
        });
      }

      const seq = i + 1;

      const item = {
        pk,
        sk: `ASSIGN#${day}#${pad4(seq)}`,

        assignment_id: uuidv4(),

        salesmanId,
        salesmanName,

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
      };

      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    }

    res.json({ success: true, message: "Assigned successfully", count: shops.length });
  } catch (e) {
    console.error("RESET+ASSIGN ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ===============================
// LIST ASSIGNED (Master/Manager/Salesman)
// - salesman: own active list
// - manager: must pass salesmanId, only own segment people (we validate later)
// ===============================
exports.listAssigned = async (req, res) => {
  try {
    const day = todayYMD();

    let salesmanId = req.query.salesmanId;

    if (req.user.role === "salesman") {
      salesmanId = req.user.id;
    } else {
      if (!salesmanId) {
        return res.status(400).json({ success: false, message: "salesmanId required" });
      }
    }

    const pk = `SALESMAN#${salesmanId}`;

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

    const items = (result.Items || []).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    res.json({ success: true, assigned: items });
  } catch (e) {
    console.error("LIST ASSIGNED ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ===============================
// REMOVE one assignment (soft)
// Body: { "sk": "ASSIGN#YYYY-MM-DD#0002", "salesmanId": "uuid" }
// ===============================
exports.removeAssigned = async (req, res) => {
  try {
    const { salesmanId, sk } = req.body;
    if (!salesmanId || !sk) return res.status(400).json({ success: false, message: "salesmanId & sk required" });

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `SALESMAN#${salesmanId}`, sk },
        UpdateExpression: "SET #st = :removed, removedAt = :at",
        ExpressionAttributeNames: { "#st": "status" },
        ExpressionAttributeValues: { ":removed": "removed", ":at": new Date().toISOString() },
      })
    );

    res.json({ success: true });
  } catch (e) {
    console.error("REMOVE ASSIGNED ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ===============================
// REORDER (drag & drop)
// Body: { "salesmanId": "uuid", "order": ["ASSIGN#...#0003","ASSIGN#...#0001", ...] }
// ===============================
exports.reorderAssigned = async (req, res) => {
  try {
    const { salesmanId, order } = req.body;

    if (!salesmanId || !Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, message: "salesmanId & order[] required" });
    }

    const pk = `SALESMAN#${salesmanId}`;
    const day = todayYMD();

    // For simplicity: update sequence number only (SK stays same)
    // (Best practice: recreate items with new SK — but that's heavier. We'll keep it simple now.)
    for (let i = 0; i < order.length; i++) {
      const sk = order[i];
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk, sk },
          UpdateExpression: "SET sequence = :seq, updatedAt = :at",
          ExpressionAttributeValues: {
            ":seq": i + 1,
            ":at": new Date().toISOString(),
          },
        })
      );
    }

    res.json({ success: true });
  } catch (e) {
    console.error("REORDER ERROR:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};
