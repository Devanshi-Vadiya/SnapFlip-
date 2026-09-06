const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const Photo = require("../models/Photo");
const authMiddleware = require("../middleware/authMiddleware");

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
});router.post("/:id/like", async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        message: "Photo not found",
      });
    }

    photo.likes = (photo.likes || 0) + 1;
    await photo.save();

    res.status(200).json({
      message: "Photo liked",
      likes: photo.likes,
    });
  } catch (error) {
    console.log("Like error:", error);
    res.status(500).json({
      message: "Failed to like photo",
    });
  }
});
// Upload photo
router.post(
  "/upload",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
  try {
    const { caption,filter } = req.body;
const username = req.user.username;

if (!req.file) {
  return res.status(400).json({
    message: "Image is required",
  });
}

    // Upload image to Cloudinary
    let transformation = [];

if (filter === "bw") {
  transformation = [{ effect: "grayscale" }];
} else if (filter === "vintage") {
  transformation = [{ effect: "sepia" }];
} else if (filter === "warm") {
  transformation = [
    {
      effect: "colorize:20",
      color: "orange",
    },
  ];
} else if (filter === "cool") {
  transformation = [
    {
      effect: "colorize:20",
      color: "blue",
    },
  ];
}

const result = await new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "snapfilter",
      transformation: transformation,
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