const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      index: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: "",
      maxlength: 200,
    },
    filter: {
      type: String,
      default: "normal",
    },
    viewers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: { type: String },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // MongoDB TTL index: expires in 24 hours
    },
  }
);

module.exports = mongoose.model("Story", storySchema);
