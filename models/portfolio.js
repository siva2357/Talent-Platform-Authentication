const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      default: "",
    },

    projectType: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    media: [
      {
        mediaType: {
          type: String,
          enum: ["image", "video"],
          default: "image",
        },
        url: {
          type: String,
          default: "",
        },
      },
    ],

    projectUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
