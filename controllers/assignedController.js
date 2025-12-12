const AssignedShop = require("../models/AssignedShop");
const Shop = require("../models/Shop");

exports.assignShop = async (req, res) => {
    try {
        const { shopName, area, salesmanName, salesmanArea, shopLat, shopLng } = req.body;

        if (area !== salesmanArea) {
            return res.status(400).json({ message: "Area mismatch" });
        }

        await AssignedShop.create({
            shopName,
            area,
            salesmanName,
            salesmanArea,
            shopLat,
            shopLng
        });

        await Shop.deleteOne({ shopName, area });

        res.json({ success: true, message: "Shop assigned" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getAssignedShops = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === "salesman") {
            filter.salesmanName = req.user.name;
        }

        const assigned = await AssignedShop.find(filter).sort({ createdAt: -1 });

        res.json({ success: true, assigned });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.reassignShop = async (req, res) => {
    try {
        const { id } = req.params;
        const { salesmanName, salesmanArea } = req.body;

        const shop = await AssignedShop.findById(id);

        if (!shop) return res.status(404).json({ message: "Not found" });

        if (shop.area !== salesmanArea)
            return res.status(400).json({ message: "Area mismatch" });

        shop.salesmanName = salesmanName;
        shop.salesmanArea = salesmanArea;
        await shop.save();

        res.json({ success: true, message: "Reassigned" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.moveBackToPending = async (req, res) => {
    try {
        const id = req.params.id;

        const shop = await AssignedShop.findById(id);
        if (!shop) return res.status(404).json({ message: "Not found" });

        await Shop.create({
            shopName: shop.shopName,
            area: shop.area,
            latitude: shop.shopLat,
            longitude: shop.shopLng
        });

        await AssignedShop.findByIdAndDelete(id);

        res.json({ success: true, message: "Moved to pending" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
    exports.removeAssigned = async (req, res) => {
  try {
    const { shop_id, user_id } = req.body;

    await AssignedShop.findOneAndDelete({
      shop_id,
      user_id
    });

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

};
