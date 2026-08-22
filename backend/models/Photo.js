const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      required: true,
    },

    caption: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Photo", photoSchema);