const express = require("express");
const router = express.Router();

const { identifier } = require("../middleware/identifier");

const {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogsAdmin,
  getBlogByIdAdmin,
  getAllPublishedBlogs,
  getBlogByIdPublic
} = require("../controllers/blogController");



// ===========================
// ADMIN ROUTES
// ===========================

router.post(
  "/admin",
  identifier,
  createBlog
);

router.get(
  "/admin",
  identifier,
  getAllBlogsAdmin
);

router.get(
  "/admin/:id",
  identifier,
  getBlogByIdAdmin
);

router.put(
  "/admin/:id",
  identifier,
  updateBlog
);

router.delete(
  "/admin/:id",
  identifier,
  deleteBlog
);

// ===========================
// PUBLIC ROUTES
// ===========================

router.get(
  "/",
  getAllPublishedBlogs
);

router.get(
  "/:id",
  getBlogByIdPublic
);



module.exports = router;