const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.register = async (req, res) => {
    try {
        const { name, phone, password, role, area } = req.body;

        const hashed = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            phone,
            password: hashed,
            role,
            area
        });

        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: "User not found" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: "Wrong password" });

        const token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                role: user.role,
                area: user.area
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ success: true, token, user });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
