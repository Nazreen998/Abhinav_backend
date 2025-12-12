require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const shopRoutes = require("./routes/shopRoutes");
const assignedRoutes = require("./routes/assignedRoutes");
const nextShopRoutes = require("./routes/nextShopRoutes");
const historyRoutes = require("./routes/historyRoutes");
const visitRoutes = require("./routes/visitRoutes");
const pendingRoutes = require("./routes/pendingRoutes");

const app = express();

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// STATIC
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =======================
// ROUTES  (⚠️ ALL BEFORE listen)
// =======================
app.use("/api/users", userRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/assigned", assignedRoutes);
app.use("/api/nextshop", nextShopRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/pending", pendingRoutes);

// DEFAULT ROUTE
app.get("/", (req, res) => {
  res.send("Backend Running Successfully!");
});

// =======================
// DB CONNECT
// =======================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("MongoDB Connection Error:", err));

// =======================
// SERVER START (LAST ONLY)
// =======================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
