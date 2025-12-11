const User = require("../models/User");
const jwt = require("jsonwebtoken");

// LOGIN USER (FIXED)
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // search using mobile (your DB field)
        const user = await User.findOne({ mobile: phone });

        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        if (user.password !== password)
            return res.status(400).json({ success: false, message: "Wrong password" });

        const token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                role: user.role,
                segment: user.segment,
                mobile: user.mobile
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({ success: true, token, user });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
