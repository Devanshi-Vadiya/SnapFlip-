const express = require("express");
const Comment = require("../models/Comment");
const Photo = require("../models/Photo");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/comments/:photoId - Fetch all comments for a photo
router.get("/:photoId", async (req, res) => {
  try {
    const comments = await Comment.find({ photo: req.params.photoId })
      .populate("user", "username avatarUrl")
      .sort({ createdAt: 1 });

    const formatted = comments.map((c) => ({
      id: c._id,
      _id: c._id,
      photoId: c.photo,
      userId: c.user ? c.user._id : c.user,
      username: (c.user && c.user.username) || c.username,
      avatarUrl: (c.user && c.user.avatarUrl) || c.avatarUrl || "",
      text: c.text,
      createdAt: c.createdAt,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Fetch comments error:", error);
    res.status(500).json({
      message: "Failed to fetch comments",
    });
  }
});

// POST /api/comments/:photoId - Add comment to a photo
router.post("/:photoId", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({
        message: "Comment text cannot be empty",
      });
    }

    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
      return res.status(404).json({
        message: "Photo not found",
      });
    }

    const comment = await Comment.create({
      photo: photo._id,
      user: req.user.id,
      username: req.user.username,
      text: String(text).trim(),
    });

    res.status(201).json({
      message: "Comment added",
      comment: {
        id: comment._id,
        _id: comment._id,
        photoId: comment.photo,
        userId: comment.user,
        username: comment.username,
        text: comment.text,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({
      message: "Failed to post comment",
    });
  }
});

// DELETE /api/comments/:id - Delete own comment
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: "You can only delete your own comments",
      });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      message: "Failed to delete comment",
    });
  }
});

module.exports = router;
