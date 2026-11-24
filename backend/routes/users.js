const express = require("express");
const User = require("../models/User");
const Photo = require("../models/Photo");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/users/search?q= - Search users by username
router.get("/search", authMiddleware, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      username: { $regex: query, $options: "i" },
      _id: { $ne: req.user.id },
    })
      .select("username avatarUrl bio createdAt")
      .limit(20);

    const formatted = users.map((u) => ({
      id: u._id,
      _id: u._id,
      username: u.username,
      avatarUrl: u.avatarUrl || "",
      bio: u.bio || "",
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
});

// GET /api/users/:username - Public user profile with stats and photos
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const photos = await Photo.find({
      $or: [{ user: user._id }, { username: user.username }],
    }).sort({ createdAt: -1 });

    let totalLikesReceived = 0;
    photos.forEach((p) => {
      totalLikesReceived += Array.isArray(p.likes)
        ? p.likes.length
        : typeof p.likes === "number"
        ? p.likes
        : 0;
    });

    res.status(200).json({
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        avatarUrl: user.avatarUrl || "",
        bio: user.bio || "",
        createdAt: user.createdAt,
      },
      stats: {
        snapsCount: photos.length,
        likesCount: totalLikesReceived,
      },
      photos: photos.map((p) => ({
        id: p._id,
        imageUrl: p.imageUrl,
        caption: p.caption,
        likes: Array.isArray(p.likes) ? p.likes.length : p.likes || 0,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

// PUT /api/users/profile - Update own profile (bio, avatarUrl)
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { bio, avatarUrl } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (bio !== undefined) user.bio = String(bio).trim();
    if (avatarUrl !== undefined) user.avatarUrl = String(avatarUrl).trim();

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

module.exports = router;
