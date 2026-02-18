const jwt = require("jsonwebtoken");
const ddb = require("../config/dynamo");
const { GetCommand } = require("@aws-sdk/lib-dynamodb");

module.exports = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || "";

      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ CORRECT DYNAMODB KEY STRUCTURE
      const result = await ddb.send(
        new GetCommand({
          TableName: "abhinav_users",
          Key: {
            pk: `USER#${decoded.id}`,
            sk: "PROFILE",
          },
        })
      );

      const user = result.Item;

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient permissions" });
      }

      req.user = {
        id: user.user_id,
        name: user.name,
        role: user.role,
        segment: user.segment || "",
        mobile: user.mobile || "",
      };

      next();
    } catch (error) {
      console.error("AUTH ERROR:", error);
      return res
        .status(401)
        .json({ message: "Invalid token", error: error.message });
    }
  };
};
