const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔥 FETCH FULL USER
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Forbidden: Insufficient permissions" });
      }

      // 🔥 THIS IS THE KEY
      req.user = {
        id: user._id,
        name: user.name,
        role: user.role,
        segment: user.segment,
      };

      next();
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Invalid token", error: error.message });
    }
  };
};
