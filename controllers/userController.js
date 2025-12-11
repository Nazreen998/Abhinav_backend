const User = require("../models/User");
const jwt = require("jsonwebtoken");

// LOGIN USER
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // ✔ your DB uses "mobile"
        const user = await User.findOne({ phone: phone });

        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        // ✔ DB stores plain text password
        if (user.password !== password)
            return res.status(400).json({ success: false, message: "Wrong password" });

        const token = jwt.sign(
            {
                id: user._id,
                user_id: user.user_id,
                name: user.name,
                role: user.role,
                segment: user.segment,
                phone: user.phone
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({ success: true, token, user });

    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
};
