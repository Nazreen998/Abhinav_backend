const { Location } = require("../models/locationModel");
// ✅ Initial create - company + locations array
module.exports = {
  createLocations: async (req, res) => {
    const { locations } = req.body;
    const { companyId, companyName } = req.user;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.json({ ok: false, error: "locations_required" });
    }

    try {
      await Location.create({ companyId, companyName, locations });
      res.json({ ok: true, message: "Locations created" });
    } catch (e) {
      res.json({ ok: false, error: e.message });
    }
  },
};

// ✅ Single location add
module.exports.addLocation = async (req, res) => {
  const { locationId, name, lat, lng, radius } = req.body;
  const { companyId } = req.user;

  if (!locationId || !name || !lat || !lng || !radius) {
    return res.json({ ok: false, error: "all_fields_required" });
  }

  try {
    await Location.addLocation({
      companyId,
      location: { locationId, name, lat, lng, radius },
    });
    res.json({ ok: true, message: "Location added" });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};

// ✅ Get all locations
module.exports.getLocations = async (req, res) => {
  const { companyId } = req.user;
  try {
    const locations = await Location.getByCompany(companyId);
    res.json({ ok: true, locations });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
};
