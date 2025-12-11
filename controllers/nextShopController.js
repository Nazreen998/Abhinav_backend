const AssignedShop = require("../models/AssignedShop");
const History = require("../models/History");
const { calculateDistance } = require("../utils/distanceCalculator");

exports.getNextShop = async (req, res) => {
    try {
        const shops = await AssignedShop.find({
            salesmanName: req.user.name
        }).sort({ createdAt: 1 });

        if (shops.length === 0)
            return res.json({ success: false, message: "No assigned shops" });

        res.json({ success: true, nextShop: shops[0] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.matchShop = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "Match image required" });

        const {
            shopName,
            area,
            shopLat,
            shopLng,
            salesmanLat,
            salesmanLng
        } = req.body;

        const distance = calculateDistance(
            Number(salesmanLat),
            Number(salesmanLng),
            Number(shopLat),
            Number(shopLng)
        );

        const status = distance <= 50 ? "SUCCESS" : "FAILED";

        await History.create({
            shopName,
            area,
            salesmanName: req.user.name,
            shopLat,
            shopLng,
            salesmanLat,
            salesmanLng,
            distance,
            matchStatus: status,
            matchImage: req.file.path
        });

        if (status === "SUCCESS") {
            await AssignedShop.deleteOne({
                shopName,
                salesmanName: req.user.name
            });
        }

        res.json({
            success: true,
            status,
            message:
                status === "SUCCESS"
                    ? "Match successful"
                    : "You are far from shop (50m)"
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
