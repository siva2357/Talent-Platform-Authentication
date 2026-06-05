const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String, default: "/assets/images/blog/ai_intelligence_blog.png" },
    readTime: { type: String, default: "5 min read" },
    status: { type: String, enum: ["Published", "Draft"], default: "Published" },
    author: {
      name: { type: String, default: "Admin Desk" },
      role: { type: String, default: "Platform Administrator" },
      avatar: { type: String, default: "assets/images/profiles/avatar-1.jpg" }
    },
    mediaType: { type: String, enum: ["image", "video", null], default: null },
    mediaUrl: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Blog", blogPostSchema);
