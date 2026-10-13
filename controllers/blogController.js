const Blog = require("../models/blog");
const MasterData = require("../models/masterData");


exports.createBlog = async (req, res) => {
  try {

    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const {
      title,
      category,
      content,
      featuredMedia,
      blogBanner,
      tags
    } = req.body;

    if (!title || !category || !content) {
      return res.status(400).json({
        success: false,
        message: "Title, category and content are required"
      });
    }

    const blogCategoriesDoc = await MasterData.findOne({ category: "BlogCategories" });
    if (blogCategoriesDoc) {
      const validKeys = blogCategoriesDoc.options.map(opt => opt.key);
      if (!validKeys.includes(category)) {
        return res.status(400).json({ success: false, message: "Invalid blog category" });
      }
    }

    const blog = await Blog.create({
      adminId: req.userId,
      title,
      category,
      content,
      featuredMedia,
      blogBanner,
      tags: tags || []
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



exports.getAllBlogsAdmin = async (req, res) => {
  try {

    if (req.role !== "admin") {
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



exports.getBlogByIdAdmin = async (req, res) => {
  try {

    if (req.role !== "admin") {
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

exports.updateBlog = async (req, res) => {
  try {

    if (req.role !== "admin") {
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
      content,
      featuredMedia,
      blogBanner,
      tags
    } = req.body;

    if (category) {
      const blogCategoriesDoc = await MasterData.findOne({ category: "BlogCategories" });
      if (blogCategoriesDoc) {
        const validKeys = blogCategoriesDoc.options.map(opt => opt.key);
        if (!validKeys.includes(category)) {
          return res.status(400).json({ success: false, message: "Invalid blog category" });
        }
      }
    }

    blog.title = title ?? blog.title;
    blog.category = category ?? blog.category;
    blog.content = content ?? blog.content;
    blog.featuredMedia = featuredMedia ?? blog.featuredMedia;
    blog.blogBanner = blogBanner ?? blog.blogBanner;
    blog.tags = tags ?? blog.tags;

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

exports.deleteBlog = async (req, res) => {
  try {

    if (req.role !== "admin") {
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



exports.getAllPublishedBlogs = async (req, res) => {
  try {

    const blogs = await Blog.find({
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


exports.getBlogByIdPublic = async (req, res) => {
  try {

    const blog = await Blog.findOne({
      _id: req.params.id
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