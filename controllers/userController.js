const ddb = require("../config/dynamo");
const {
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// ==============================
// LOGIN USER
// ==============================
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const result = await ddb.send(
      new ScanCommand({
        TableName: "abhinav_users",
        FilterExpression: "mobile = :m",
        ExpressionAttributeValues: {
          ":m": phone,
        },
      })
    );

    const user = result.Items?.[0];

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (user.password !== password)
      return res.status(400).json({ success: false, message: "Wrong password" });

    const token = jwt.sign(
      {
        id: user.user_id,
        name: user.name,
        role: user.role,
        segment: user.segment,
        phone: user.mobile,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// ADD USER
// ==============================
exports.addUser = async (req, res) => {
  try {
    const { name, mobile, role, segment, password } = req.body;

    const userId = uuidv4();

    const newUser = {
      pk: `USER#${userId}`,
      sk: "PROFILE",

      user_id: userId,
      name,
      mobile,
      role,
      segment: segment || "",
      password,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: "abhinav_users",
        Item: newUser,
      })
    );

    res.json({ success: true, user: newUser });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// GET ALL USERS
// ==============================
exports.getAllUsers = async (req, res) => {
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: "abhinav_users",
      })
    );

    res.json({ success: true, users: result.Items || [] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// UPDATE USER
// ==============================
exports.updateUser = async (req, res) => {
  try {
    const { name, mobile, role, segment, password } = req.body;

    await ddb.send(
      new UpdateCommand({
        TableName: "abhinav_users",
        Key: {
          pk: `USER#${req.params.id}`,
          sk: "PROFILE",
        },
        UpdateExpression:
          "SET #n = :name, mobile = :mobile, #r = :role, #s = :segment, password = :password",
        ExpressionAttributeNames: {
          "#n": "name",
          "#r": "role",
          "#s": "segment",
        },
        ExpressionAttributeValues: {
          ":name": name,
          ":mobile": mobile,
          ":role": role,
          ":segment": segment,
          ":password": password,
        },
      })
    );

    res.json({ success: true, message: "User updated successfully" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// ==============================
// DELETE USER
// ==============================
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    await ddb.send(
      new DeleteCommand({
        TableName: "abhinav_users",
        Key: {
          pk: `USER#${userId}`,
          sk: "PROFILE",
        },
      })
    );

    res.json({ success: true, message: "User deleted", deleted: userId });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
