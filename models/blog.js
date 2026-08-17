const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
{
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  title: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  content: {
    type: String,
    required: true
  },

  featuredMedia: {
    type: String,
    default: null
  },

  blogBanner: {
    type: String,
    default: null
  },

  tags: {
    type: [String],
    default: []
  },

  status: {
    type: String,
    enum: ["Published", "Draft"],
    default: "Draft"
  }
},
{
  timestamps: true
}
);

module.exports = mongoose.model("Blog", blogSchema);