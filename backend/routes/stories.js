const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const Story = require("../models/Story");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// GET /api/stories/feed - Active stories grouped by user
router.get("/feed", async (req, res) => {
  try {
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;
      } catch (e) {
        // Continue unauthenticated if token invalid
      }
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stories = await Story.find({ createdAt: { $gte: cutoff } })
      .populate("user", "username avatarUrl")
      .sort({ createdAt: 1 });

    // Group active stories by user
    const grouped = {};

    stories.forEach((s) => {
      const uid = s.user ? s.user._id.toString() : s.user.toString();
      const uname = (s.user && s.user.username) || s.username;
      const avatar = (s.user && s.user.avatarUrl) || s.avatarUrl || "";

      if (!grouped[uid]) {
        grouped[uid] = {
          userId: uid,
          username: uname,
          avatarUrl: avatar,
          stories: [],
          hasUnseen: false,
        };
      }

      const hasViewed = currentUserId
        ? (s.viewers || []).some(
            (v) => (v.user ? v.user.toString() : "") === currentUserId.toString()
          )
        : false;

      if (!hasViewed) {
        grouped[uid].hasUnseen = true;
      }

      grouped[uid].stories.push({
        id: s._id,
        _id: s._id,
        imageUrl: s.imageUrl,
        cloudinaryPublicId: s.cloudinaryPublicId,
        caption: s.caption,
        filter: s.filter,
        viewsCount: (s.viewers || []).length,
        hasViewed,
        createdAt: s.createdAt,
      });
    });

    const result = Object.values(grouped);
    res.status(200).json(result);
  } catch (error) {
    console.error("Fetch stories error:", error);
    res.status(500).json({
      message: "Failed to fetch stories",
    });
  }
});

// POST /api/stories/upload - Upload a new 24h story
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
          message: "Story image is required",
        });
      }

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

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "snapflip_stories",
            transformation: transformation.length > 0 ? transformation : undefined,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const story = await Story.create({
        user: userId,
        username,
        imageUrl: result.secure_url,
        cloudinaryPublicId: result.public_id,
        caption: caption || "",
        filter: filter || "normal",
        viewers: [],
      });

      res.status(201).json({
        message: "Story posted successfully 🌟",
        story: {
          id: story._id,
          imageUrl: story.imageUrl,
          caption: story.caption,
          createdAt: story.createdAt,
        },
      });
    } catch (error) {
      console.error("Story upload error:", error);
      res.status(500).json({
        message: "Failed to upload story: " + (error.message || "Unknown error"),
      });
    }
  }
);

// POST /api/stories/:id/view - Mark story as viewed
router.post("/:id/view", authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const userId = req.user.id;
    const username = req.user.username;

    const alreadyViewed = (story.viewers || []).some(
      (v) => (v.user ? v.user.toString() : "") === userId.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push({
        user: userId,
        username,
        viewedAt: new Date(),
      });
      await story.save();
    }

    res.status(200).json({
      message: "Story viewed",
      viewsCount: story.viewers.length,
    });
  } catch (error) {
    console.error("Story view error:", error);
    res.status(500).json({ message: "Failed to record story view" });
  }
});

// DELETE /api/stories/:id - Delete own story
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (story.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "You can only delete your own stories" });
    }

    if (story.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(story.cloudinaryPublicId);
      } catch (cloudErr) {
        console.error("Failed to delete story asset from Cloudinary:", cloudErr);
      }
    }

    await Story.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Story deleted successfully" });
  } catch (error) {
    console.error("Story delete error:", error);
    res.status(500).json({ message: "Failed to delete story" });
  }
});

module.exports = router;
