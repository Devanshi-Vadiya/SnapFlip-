const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const Photo = require("../models/Photo");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

// GET /api/photos - Fetch all photos for feed
router.get("/", async (req, res) => {
  try {
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (err) {
        // Continue unauthenticated if token invalid
      }
    }

    const photos = await Photo.find()
      .populate("user", "username avatarUrl")
      .sort({ createdAt: -1 });

    const formatted = photos.map((p) => {
      const likesArray = Array.isArray(p.likes) ? p.likes : [];
      const likesCount = Array.isArray(p.likes)
        ? p.likes.length
        : typeof p.likes === "number"
        ? p.likes
        : 0;

      const isLikedByMe = currentUserId
        ? likesArray.some((id) => id.toString() === currentUserId.toString())
        : false;

      return {
        _id: p._id,
        id: p._id,
        imageUrl: p.imageUrl,
        cloudinaryPublicId: p.cloudinaryPublicId,
        username: p.username || (p.user && p.user.username) || "user",
        avatarUrl: (p.user && p.user.avatarUrl) || p.avatarUrl || "",
        caption: p.caption || "",
        filter: p.filter || "normal",
        likes: likesCount,
        isLikedByMe,
        createdAt: p.createdAt,
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Fetch photos error:", error);
    res.status(500).json({
      message: "Failed to fetch photos",
    });
  }
});

// POST /api/photos/upload - Upload photo with filter and caption
router.post(
  "/upload",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      const { caption, filter } = req.body;
      const userId = req.user.id;
      const username = req.user.username;

      if (!req.file) {
        return res.status(400).json({
          message: "Image file is required",
        });
      }

      // Configure Cloudinary transformations if specified
      let transformation = [];
      if (filter === "bw") {
        transformation = [{ effect: "grayscale" }];
      } else if (filter === "vintage") {
        transformation = [{ effect: "sepia" }];
      } else if (filter === "warm") {
        transformation = [{ effect: "colorize:20", color: "orange" }];
      } else if (filter === "cool") {
        transformation = [{ effect: "colorize:20", color: "blue" }];
      }

      // Upload buffer to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "snapflip",
            transformation: transformation.length > 0 ? transformation : undefined,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      // Save to MongoDB with user relation and Cloudinary public ID
      const photo = await Photo.create({
        user: userId,
        username,
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        caption: caption || "",
        filter: filter || "normal",
        likes: [],
      });

      res.status(201).json({
        message: "Photo uploaded successfully",
        photo: {
          id: photo._id,
          _id: photo._id,
          imageUrl: photo.imageUrl,
          cloudinaryPublicId: photo.cloudinaryPublicId,
          username: photo.username,
          caption: photo.caption,
          filter: photo.filter,
          likes: 0,
          createdAt: photo.createdAt,
        },
      });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({
        message: "Photo upload failed: " + (error.message || "Unknown error"),
      });
    }
  }
);

// POST /api/photos/:id/like (Atomic toggle will be expanded in Checkpoint 4)
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);

    if (!photo) {
      return res.status(404).json({
        message: "Photo not found",
      });
    }

    const userId = req.user.id;
    let isLiked = false;

    // Migrate from numeric likes to array if needed
    if (!Array.isArray(photo.likes)) {
      photo.likes = [];
    }

    const userLikedIndex = photo.likes.findIndex(
      (id) => id.toString() === userId.toString()
    );

    if (userLikedIndex > -1) {
      // User already liked -> unlike
      photo.likes.splice(userLikedIndex, 1);
      isLiked = false;
    } else {
      // User has not liked -> like
      photo.likes.push(userId);
      isLiked = true;
    }

    await photo.save();

    res.status(200).json({
      message: isLiked ? "Photo liked" : "Photo unliked",
      likes: photo.likes.length,
      isLiked,
    });
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({
      message: "Failed to update like status",
    });
  }
});

module.exports = router;
