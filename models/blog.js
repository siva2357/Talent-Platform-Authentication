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

  description: {
    type: String,
    required: true
  },

  mediaUrl: {
    type: String,
    default: null
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