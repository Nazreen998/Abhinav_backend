require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
// ✅ ADD THIS
const { sql, connectSQL } = require("./config/db-sql");
// ROUTES
const userRoutes = require("./routes/userRoutes");
const shopRoutes = require("./routes/shopRoutes");
const assignedRoutes = require("./routes/assignedRoutes");
const nextShopRoutes = require("./routes/nextShopRoutes");
const historyRoutes = require("./routes/historyRoutes");
const visitRoutes = require("./routes/visitRoutes");
const pendingRoutes = require("./routes/pendingRoutes");
const billRoutes = require("./routes/billRoutes");
const app = express();
// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/test-sql", async (req, res) => {
  try {
    const result = await sql.query("SELECT GETDATE() AS time");
    res.json({
      success: true,
      data: result.recordset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
// =======================
// STATIC FILES (🔥 VERY IMPORTANT)
// =======================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// ROUTES (⚠️ ALL BEFORE listen)
// =======================
app.use("/api/users", userRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/assigned", assignedRoutes);
app.use("/api/nextshop", nextShopRoutes);     // ✅ ONLY HERE
app.use("/api/history", historyRoutes);
app.use("/api/pending", pendingRoutes);
app.use("/api/visit", visitRoutes);
app.use("/api/bills", billRoutes);

// ❌ DO NOT mount nextShopRoutes again
app.use("/api/assign", nextShopRoutes);   

// =======================
// DEFAULT ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("Backend Running Successfully!");
});

// =======================
// TEST ROUTE (KEEP AS IS)
// =======================
app.get("/api/assign/test", (req, res) => {
  res.json({ success: true, message: "ASSIGN ROUTE WORKING" });
});
// =======================
// SERVER START (🔥 MUST BE LAST)
// =======================
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
