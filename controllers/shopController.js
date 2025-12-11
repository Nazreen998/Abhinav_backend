const Shop = require("../models/Shop");

exports.addShop = async (req, res) => {
    try {
        const {
            shopName,
            area,
            shopAddress,
            ownerName,
            contactNumber,
            latitude,
            longitude
        } = req.body;

        if (!shopName || !area) {
            return res.status(400).json({ message: "Shop name & area needed" });
        }

        const shopImage = req.file ? req.file.path : null;

        const shop = await Shop.create({
            shopName,
            area,
            shopAddress,
            ownerName,
            contactNumber,
            latitude,
            longitude,
            shopImage,
            createdBy: req.user.role
        });

        res.json({ success: true, shop });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getAllShops = async (req, res) => {
    try {
        const shops = await Shop.find().sort({ createdAt: -1 });
        res.json({ success: true, shops });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.deleteShop = async (req, res) => {
    try {
        const id = req.params.id;
        await Shop.findByIdAndDelete(id);
        res.json({ success: true, message: "Shop deleted" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
