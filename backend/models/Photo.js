const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
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
      maxlength: 300,
    },
    filter: {
      type: String,
      default: "normal",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Photo", photoSchema);
