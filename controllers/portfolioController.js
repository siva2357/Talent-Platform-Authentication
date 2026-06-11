const User = require("../models/user");
const Portfolio = require("../models/portfolio");
const FreelancerProfile = require("../models/freelancerProfile");


exports.createPortfolio = async (req, res, next) => {
  try {

    if (req.user.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can create portfolio items."
      });
    }

    const profile = await FreelancerProfile.findOne({
      userId: req.user._id
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Complete your freelancer profile first."
      });
    }

    const portfolio = await Portfolio.create({
      freelancerId: req.user._id,
      title: req.body.title,
      description: req.body.description || "",
      role: req.body.role || "",
      projectType: req.body.projectType || "",
      tags: req.body.tags || [],
      media: req.body.media || [],
      projectUrl: req.body.projectUrl || ""
    });

    res.status(201).json({
      success: true,
      message: "Portfolio created successfully.",
      portfolio
    });

  } catch (err) {
    next(err);
  }
};

exports.getMyPortfolio = async (req, res, next) => {
  try {

    if (req.user.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can access portfolio."
      });
    }

    const portfolios = await Portfolio.find({
      freelancerId: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      portfolios
    });

  } catch (err) {
    next(err);
  }
};



exports.getPortfolioByFreelancerId = async (req, res, next) => {
  try {

    const { freelancerId } = req.params;

    const portfolios = await Portfolio.find({
      freelancerId
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      portfolios
    });

  } catch (err) {
    next(err);
  }
};



exports.updatePortfolio = async (req, res, next) => {
  try {

    if (req.user.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can update portfolio."
      });
    }

    const { portfolioId } = req.params;

    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      freelancerId: req.user._id
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found."
      });
    }

    if (req.body.title !== undefined)
      portfolio.title = req.body.title;

    if (req.body.description !== undefined)
      portfolio.description = req.body.description;

    if (req.body.role !== undefined)
      portfolio.role = req.body.role;

    if (req.body.projectType !== undefined)
      portfolio.projectType = req.body.projectType;

    if (req.body.tags !== undefined)
      portfolio.tags = req.body.tags;

    if (req.body.media !== undefined)
      portfolio.media = req.body.media;

    if (req.body.projectUrl !== undefined)
      portfolio.projectUrl = req.body.projectUrl;

    await portfolio.save();

    res.status(200).json({
      success: true,
      message: "Portfolio updated successfully.",
      portfolio
    });

  } catch (err) {
    next(err);
  }
};


exports.deletePortfolio = async (req, res, next) => {
  try {

    if (req.user.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can delete portfolio."
      });
    }

    const { portfolioId } = req.params;

    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      freelancerId: req.user._id
    });

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: "Portfolio not found."
      });
    }

    await Portfolio.deleteOne({
      _id: portfolioId
    });

    res.status(200).json({
      success: true,
      message: "Portfolio deleted successfully."
    });

  } catch (err) {
    next(err);
  }
};