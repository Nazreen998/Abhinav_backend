const jwt = require("jsonwebtoken");

module.exports = (allowedRoles) => {
    return (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                return res.status(401).json({ message: "No token provided" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;

            if (!allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            }

            next();
        } catch (error) {
            res.status(401).json({ message: "Invalid token", error: error.message });
        }
    };
};
