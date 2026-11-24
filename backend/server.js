const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

const app = express();
const authRoutes = require("./routes/auth");
const photoRoutes = require("./routes/photos");

// Middleware
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/photos", photoRoutes);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    app: "SnapFlip Backend",
    message: "SnapFlip API is running 🚀",
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Backend Error:", err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
  });
});

// Database Connection & Server Listen
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SnapFlip Server running on port ${PORT} 🚀`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌", error.message);
  });

module.exports = app;
