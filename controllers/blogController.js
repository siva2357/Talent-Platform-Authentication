const Blog = require("../models/blog");


// ====================================
// CREATE BLOG
// POST /api/blogs/admin
// ====================================

exports.createBlog = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const {
      title,
      category,
      description,
      mediaUrl,
      status
    } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({
        success: false,
        message: "Title, category and description are required"
      });
    }

    const blog = await Blog.create({
      adminId: req.userId,
      title,
      category,
      description,
      mediaUrl,
      status
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ====================================
// GET ALL BLOGS ADMIN
// GET /api/blogs/admin
// ====================================

exports.getAllBlogsAdmin = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const blogs = await Blog.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      blogs
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ====================================
// GET BLOG BY ID ADMIN
// GET /api/blogs/admin/:id
// ====================================

exports.getBlogByIdAdmin = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    return res.status(200).json({
      success: true,
      blog
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ====================================
// UPDATE BLOG
// PUT /api/blogs/admin/:id
// ====================================

exports.updateBlog = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    const {
      title,
      category,
      description,
      mediaUrl,
      status
    } = req.body;

    blog.title = title ?? blog.title;
    blog.category = category ?? blog.category;
    blog.description = description ?? blog.description;
    blog.mediaUrl = mediaUrl ?? blog.mediaUrl;
    blog.status = status ?? blog.status;

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ====================================
// DELETE BLOG
// DELETE /api/blogs/admin/:id
// ====================================

exports.deleteBlog = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const blog = await Blog.findByIdAndDelete(
      req.params.id
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully"
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ====================================
// PUBLIC BLOGS
// GET /api/blogs
// ====================================

exports.getAllPublishedBlogs = async (req, res) => {
  try {

    const blogs = await Blog.find({
      status: "Published"
    }).sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      blogs
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};


// ====================================
// PUBLIC BLOG BY ID
// GET /api/blogs/:id
// ====================================

exports.getBlogByIdPublic = async (req, res) => {
  try {

    const blog = await Blog.findOne({
      _id: req.params.id,
      status: "Published"
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }

    return res.status(200).json({
      success: true,
      blog
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};