const { Attendance } = require("../models/attendanceModel");
const { calculateDistance } = require("../utils/distanceCalculator");
const Location = require("../models/locationModel"); // ✅ DB locations

const todayIST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// ─── CHECK IN ───────────────────────────────────────────────
module.exports.checkIn = async (req, res) => {
  const { lat, lng } = req.body;

  const rawPk = req.user.pk;
  const uid = rawPk?.includes("#") ? rawPk.split("#")[1] : rawPk;
  const userName =
    req.user.name || req.user.Name || req.user.username || "UNKNOWN";
  const companyId = req.user.companyId; // ✅ token-லிருந்து

  if (!lat || !lng) {
    return res.json({ ok: false, error: "location_required" });
  }

  // ✅ DB-லிருந்து locations fetch
  const locations = await Location.getByCompany(companyId);

  if (!locations || locations.length === 0) {
    return res.json({ ok: false, error: "no_locations_configured" });
  }

  let matchedLocation = null;
  let distance = null;

  for (const loc of locations) {
    const d = calculateDistance(lat, lng, loc.lat, loc.lng);
    if (d <= loc.radius) {
      matchedLocation = loc;
      distance = Math.round(d);
      break;
    }
  }

  if (!matchedLocation) {
    return res.json({ ok: false, error: "outside_all_locations" });
  }

  try {
    await Attendance.checkIn({
      uid,
      userName,
      date: todayIST(),
      lat,
      lng,
      distance,
      locationId: matchedLocation.locationId,
      locationName: matchedLocation.name,
    });

    res.json({ ok: true, locationName: matchedLocation.name });
  } catch (e) {
    console.error("CHECKIN ERROR:", e);
    res.json({ ok: false, error: "already_checked_in" });
  }
};

// ─── CHECK OUT ──────────────────────────────────────────────
module.exports.checkOut = async (req, res) => {
  const { lat, lng } = req.body;

  const rawPk = req.user.pk;
  const uid = rawPk?.includes("#") ? rawPk.split("#")[1] : rawPk;
  const companyId = req.user.companyId; // ✅ token-லிருந்து

  if (!lat || !lng) {
    return res.json({ ok: false, error: "location_required" });
  }

  // ✅ DB-லிருந்து locations fetch
  const locations = await Location.getByCompany(companyId);

  if (!locations || locations.length === 0) {
    return res.json({ ok: false, error: "no_locations_configured" });
  }

  let matchedLocation = null;
  let distance = null;

  for (const loc of locations) {
    const d = calculateDistance(lat, lng, loc.lat, loc.lng);
    if (d <= loc.radius) {
      matchedLocation = loc;
      distance = Math.round(d);
      break;
    }
  }

  if (!matchedLocation) {
    return res.json({ ok: false, error: "outside_all_locations" });
  }

  const attendance = await Attendance.get(uid, todayIST());

  if (!attendance) {
    return res.json({ ok: false, error: "no_checkin_found" });
  }

  const attendanceDate = attendance.SK.replace("DATE#", "");

  try {
    await Attendance.checkOut({
      uid,
      date: attendanceDate,
      lat,
      lng,
      locationId: matchedLocation.locationId,
      locationName: matchedLocation.name,
      distance,
    });

    res.json({ ok: true, locationName: matchedLocation.name });
  } catch (e) {
    console.error("CHECKOUT ERROR:", e);
    res.json({ ok: false, error: "already_checked_out" });
  }
};
