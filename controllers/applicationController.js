const Application = require("../models/application");
const Contract = require("../models/contract");
const FreelancerProfile = require("../models/freelancerProfile");
const User = require("../models/user");
const Notification = require("../models/notification");
const sendMail = require("../middleware/sendMail");

const notifyFreelancerStageUpdate = async (application, statusText) => {
  try {
    const freelancerUser = await User.findById(application.freelancerId);
    const contract = await Contract.findById(application.contractId);
    const clientUser = await User.findById(application.clientId);
    const clientName = clientUser?.registrationDetails?.fullName || "Client";

    // 1. Create in-app notification
    await Notification.create({
      userId: application.freelancerId,
      role: "freelancer",
      title: "Recruitment Stage Updated",
      message: `Your application status for "${contract?.contractTitle || 'Contract'}" has been updated to "${statusText}" by ${clientName}.`,
      link: "/user/proposals"
    });

    // 2. Send email notification
    if (freelancerUser?.registrationDetails?.email) {
      await sendMail.sendMail({
        from: `"Talent Hub" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
        to: freelancerUser.registrationDetails.email,
        subject: "Talent Hub - Application Stage Updated",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4A90E2; text-align: center;">Application Status Updated</h2>
            <p>Hello ${freelancerUser.registrationDetails.fullName},</p>
            <p>Your application for the contract <strong>${contract?.contractTitle || 'Contract'}</strong> has been updated by the client.</p>
            <p><strong>New Status:</strong> ${statusText}</p>
            \${application.interview?.feedback ? \`<p><strong>Feedback:</strong> \${application.interview.feedback}</p>\` : ''}
            <p>Please log in to your account to view details or proceed with next steps.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
            <p style="text-align: center; color: #aaa; font-size: 12px;">© \${new Date().getFullYear()} Talent Hub. All rights reserved.</p>
          </div>
        `
      });
    }
  } catch (err) {
    console.error("Failed to notify freelancer stage update:", err);
  }
};

exports.shortlistApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update applications",
      });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus !== "application received") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'application received' state.",
      });
    }

    application.applicationStatus = "application shortlisted";

    await application.save();

    await notifyFreelancerStageUpdate(application, "Shortlisted for Review");

    return res.status(200).json({
      success: true,
      message: "Application shortlisted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update applications",
      });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Application is already rejected.",
      });
    }

    application.applicationStatus = "rejected";

    await application.save();

    await notifyFreelancerStageUpdate(application, "Declined");

    return res.status(200).json({
      success: true,
      message: "Application rejected",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.scheduleAssessment = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update applications",
      });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus !== "application shortlisted") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'application shortlisted' state.",
      });
    }

    application.applicationStatus = "assessment scheduled";

    application.assessment = {
      title: req.body.title,

      description: req.body.description,

      date: req.body.date,

      status: "pending",
    };

    await application.save();

    await notifyFreelancerStageUpdate(application, "Assessment Scheduled");

    return res.status(200).json({
      success: true,
      message: "Assessment scheduled",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.submitAssessment = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can submit assessments",
      });
    }

    if (application.freelancerId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus !== "assessment scheduled") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'assessment scheduled' state.",
      });
    }

    application.applicationStatus = "assessment completed";
    application.assessment.status = "completed";

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Assessment submitted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.assessmentResult = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update applications",
      });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus !== "assessment scheduled") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'assessment scheduled' state.",
      });
    }

    const result = req.body.result;

    if (result === "passed") {
      application.applicationStatus = "assessment completed";
      application.assessment.status = "passed";
    } else {
      application.applicationStatus = "rejected";
      application.assessment.status = "failed";
    }

    await application.save();

    await notifyFreelancerStageUpdate(application, result === "passed" ? "Assessment Passed" : "Assessment Failed");

    return res.status(200).json({
      success: true,
      message: "Assessment updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.scheduleInterview = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update applications",
      });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus !== "assessment completed" && application.applicationStatus !== "interview scheduled") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'assessment completed' or 'interview scheduled' state.",
      });
    }

    application.applicationStatus = "interview scheduled";

    application.interview = {
      title: req.body.title,

      description: req.body.description,

      date: req.body.date,

      status: "pending",
    };

    await application.save();

    await notifyFreelancerStageUpdate(application, "Interview Scheduled");

    return res.status(200).json({
      success: true,
      message: "Interview scheduled",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.interviewResult = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update applications",
      });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus !== "interview scheduled") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'interview scheduled' state.",
      });
    }

    application.applicationStatus = "interview completed";
    application.interview.status = "completed";

    if (req.body.feedback !== undefined) {
      application.interview.feedback = req.body.feedback;
    }

    await application.save();

    await notifyFreelancerStageUpdate(application, "Interview Completed");

    return res.status(200).json({
      success: true,
      message: "Interview marked as completed",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.finalizeApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can update applications",
      });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this application",
      });
    }

    if (application.applicationStatus !== "interview completed") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'interview completed' state.",
      });
    }

    const result = req.body.result; // "shortlisted" or "rejected"

    if (result === "shortlisted") {
      application.applicationStatus = "shortlisted";
    } else {
      application.applicationStatus = "rejected";
    }

    await application.save();

    await notifyFreelancerStageUpdate(application, result === "shortlisted" ? "Shortlisted" : "Declined");

    return res.status(200).json({
      success: true,
      message: `Application final status updated to ${result}`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path: "clientId",
        select: "registrationDetails.fullName registrationDetails.email companyDetails role"
      })
      .populate({
        path: "freelancerId",
        select: "registrationDetails.fullName registrationDetails.email role"
      })
      .populate({
        path: "contractId",
        select: "contractTitle estimatedBudget contractStartDate contractEndDate contractDescription contractType contractSubject status clientId"
      });

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Verify ownership
    if (application.freelancerId._id.toString() !== req.userId.toString() &&
        application.clientId._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    return res.status(200).json({ success: true, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
