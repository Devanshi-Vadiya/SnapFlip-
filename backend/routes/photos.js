const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Photo = require("../models/Photo");

const router = express.Router();

// Store uploaded image temporarily in memory
const upload = multer({
  storage: multer.memoryStorage(),
});

// =========================
// GET ALL PHOTOS
// =========================

router.get("/", async (req, res) => {
  try {
    const photos = await Photo.find().sort({ _id: -1 });

    res.status(200).json(photos);
  } catch (error) {
    console.log("Fetch photos error:", error);

    res.status(500).json({
      message: "Failed to fetch photos",
    });
  }
});
// Upload photo
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { username, caption } = req.body;

    if (!req.file || !username) {
      return res.status(400).json({
        message: "Image and username are required",
      });
    }

    // Upload image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "snapfilter",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    // Save Cloudinary URL in MongoDB
    const photo = await Photo.create({
      imageUrl: result.secure_url,
      username,
      caption: caption || "",
    });

    res.status(201).json({
      message: "Photo uploaded successfully",
      photo,
    });
  } catch (error) {
    console.log("Photo upload error:", error);

    res.status(500).json({
      message: "Photo upload failed",
    });
  }
});

module.exports = router;