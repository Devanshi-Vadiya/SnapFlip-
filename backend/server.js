const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

const app = express();
const authRoutes = require("./routes/auth");
const photoRoutes = require("./routes/photos");

app.use(express.json());
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
app.use("/api/auth", authRoutes);
app.use("/api/photos", photoRoutes);

app.get("/", (req, res) => {
  res.send("SnapFilter Backend is running 🚀");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");

    app.listen(5000, () => {
      console.log("Server running on port 5000 🚀");
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed ❌");
    console.log(error.message);
  });