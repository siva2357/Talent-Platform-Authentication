const express = require("express");
const router = express.Router();
const { identifier } = require("../middleware/identifier");
const {
  getAllPosts,
  getPublishedPosts,
  getPostBySlug,
  createPost,
  togglePostStatus,
  deletePost,
  updatePost
} = require("../controllers/blogController");

router.get("/", getAllPosts);
router.get("/published", getPublishedPosts);
router.get("/post/:slug", getPostBySlug);

router.post("/", identifier, createPost);
router.put("/:id", identifier, updatePost);
router.patch("/:id/status", identifier, togglePostStatus);
router.delete("/:id", identifier, deletePost);

module.exports = router;
