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

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
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

    githubUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Published", "Draft"],
      default: "Draft",
    },

    visibility: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
    },

    featured: {
      type: Boolean,
      default: false,
    },

    client: {
      type: String,
      default: "",
    },

    teamSize: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
