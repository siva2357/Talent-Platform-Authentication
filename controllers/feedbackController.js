const Feedback = require("../models/feedback");
const Contract = require("../models/contract");
const User = require("../models/user");

// @desc    Submit feedback for a completed contract
// @route   POST /api/feedback/submit
// @access  Private (Client only)
exports.submitFeedback = async (req, res) => {
  try {
    if (req.role !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can submit feedback.",
      });
    }

    const {
      contractId,
      freelancerId,
      overallRating,
      categories,
      clientComments,
      pros,
      cons,
    } = req.body;

    if (!contractId || !freelancerId || overallRating === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide contractId, freelancerId, and overallRating.",
      });
    }

    // Ensure the contract exists and belongs to the client
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    if (contract.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    // Verify contract is completed
    if (contract.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted for completed contracts.",
      });
    }

    // Check if feedback already exists for this contract by this client
    const existingFeedback = await Feedback.findOne({
      contractId,
      clientId: req.userId,
    });
    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this contract.",
      });
    }

    // Create the feedback record
    const feedback = await Feedback.create({
      contractId,
      clientId: req.userId,
      freelancerId,
      overallRating,
      categories: categories || {},
      clientComments: clientComments || "",
      pros: pros || [],
      cons: cons || [],
    });

    // Update freelancer's profile score (Job Success Score / Rating)
    // We fetch all feedbacks for this freelancer and calculate the average
    const allFreelancerFeedback = await Feedback.find({ freelancerId });
    const totalRating = allFreelancerFeedback.reduce((sum, f) => sum + f.overallRating, 0);
    const averageRating = totalRating / allFreelancerFeedback.length;

    const freelancer = await User.findById(freelancerId);
    if (freelancer && freelancer.profile) {
      freelancer.profile.rating = parseFloat(averageRating.toFixed(1));
      // Optionally update jobSuccessScore here if applicable
      await freelancer.save();
    }

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      feedback,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get feedback for a specific contract
// @route   GET /api/feedback/contract/:contractId
// @access  Private
exports.getFeedbackByContractId = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ contractId: req.params.contractId })
      .populate("clientId", "registrationDetails.fullName")
      .populate("freelancerId", "registrationDetails.fullName profile.title");
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found." });
    }
    
    return res.status(200).json({ success: true, feedback });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
