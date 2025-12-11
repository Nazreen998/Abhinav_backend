const Shop = require("../models/Shop");

// ⭐ ADD SHOP
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

        if (!shopName || !area)
            return res.status(400).json({ success: false, message: "Shop name & area required" });

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
            createdBy: req.user.role,
            isDeleted: false
        });

        res.json({ success: true, shop });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};


// ⭐ UPDATE SHOP (EDITS from Flutter)
exports.updateShop = async (req, res) => {
    try {
        const id = req.params.id; // MongoDB ObjectId

        const updated = await Shop.findByIdAndUpdate(
            id,
            {
                shopName: req.body.shopName,
                shopAddress: req.body.shopAddress,
                segment: req.body.segment
            },
            { new: true }
        );

        if (!updated)
            return res.status(404).json({ success: false, message: "Shop not found" });

        res.json({ success: true, shop: updated });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// ⭐ ONLY ACTIVE SHOPS (not soft-deleted)
exports.listShops = async (req, res) => {
    try {
        const shops = await Shop.find({ isDeleted: false }).sort({ createdAt: -1 });
        res.json({ success: true, shops });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};


// ⭐ SOFT DELETE SHOP (App only)
exports.softDeleteShop = async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await Shop.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );

        if (!deleted)
            return res.status(404).json({ success: false, message: "Shop not found" });

        res.json({ success: true, message: "Shop deleted inside app only" });

    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
