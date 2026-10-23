const Application = require("../models/application");
const Contract = require("../models/contract");
const FreelancerProfile = require("../models/freelancerProfile");
const User = require("../models/user");
const Notification = require("../models/notification");
const { 
  sendApplicationStageEmail, 
  sendAssessmentSubmittedNotification,
  sendInterviewScheduledClientNotification 
} = require("../utils/emailSender");

const notifyFreelancerStageUpdate = async (application, statusText, extra = {}) => {
  try {
    const freelancerUser = await User.findById(application.freelancerId);
    const contract = await Contract.findById(application.contractId);
    const clientUser = await User.findById(application.clientId);
    const clientName = clientUser?.registrationDetails?.fullName || "Client";
    const contractTitle = contract?.contractTitle || "Contract";

    let notifTitle = `Stage Update: ${statusText}`;
    let notifMessage = `Your application status for "${contractTitle}" has been updated to "${statusText}" by ${clientName}.`;

    const lowerStatus = statusText.toLowerCase();
    if (lowerStatus.includes("application submitted")) {
      notifTitle = "Application Submitted";
      notifMessage = `Your application for "${contractTitle}" has been submitted successfully.`;
    } else if (lowerStatus.includes("shortlist")) {
      notifTitle = "Application Shortlisted";
      notifMessage = `Congratulations! Your application for "${contractTitle}" has been shortlisted by ${clientName}.`;
    } else if (lowerStatus.includes("assessment assigned")) {
      notifTitle = "Assessment Task Assigned";
      notifMessage = `An assessment task has been assigned for "${contractTitle}" by ${clientName}.`;
    } else if (lowerStatus.includes("assessment submitted")) {
      notifTitle = "Assessment Submitted";
      notifMessage = `Your assessment for "${contractTitle}" has been submitted successfully to ${clientName}.`;
    } else if (lowerStatus.includes("assessment passed")) {
      notifTitle = "Assessment Passed 🎉";
      notifMessage = `You passed the assessment stage for "${contractTitle}".`;
    } else if (lowerStatus.includes("assessment failed")) {
      notifTitle = "Assessment Update";
      notifMessage = `Your assessment for "${contractTitle}" was marked as failed by ${clientName}.`;
    } else if (lowerStatus.includes("interview scheduled")) {
      notifTitle = "Interview Scheduled";
      notifMessage = `An interview for "${contractTitle}" has been scheduled with ${clientName}.`;
    } else if (lowerStatus.includes("interview completed")) {
      notifTitle = "Interview Completed";
      notifMessage = `Your interview for "${contractTitle}" was marked as completed by ${clientName}.`;
    } else if (lowerStatus.includes("hired")) {
      notifTitle = "Application Accepted - Hired! 🚀";
      notifMessage = `Congratulations! ${clientName} has selected you for "${contractTitle}".`;
    } else if (lowerStatus.includes("declined") || lowerStatus.includes("rejected")) {
      notifTitle = "Application Update";
      notifMessage = `Your application for "${contractTitle}" was not selected by ${clientName}.`;
    }

    // 1. Create in-app notification for Freelancer
    await Notification.create({
      userId: application.freelancerId,
      role: "freelancer",
      title: notifTitle,
      message: notifMessage,
      link: "/proposal-offers"
    });

    // 2. Send email notification to Freelancer
    if (freelancerUser?.registrationDetails?.email) {
      const interviewDate = application.interview?.date 
        ? new Date(application.interview.date).toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
        : undefined;

      await sendApplicationStageEmail(freelancerUser.registrationDetails.email, {
        freelancerName: freelancerUser.registrationDetails.fullName,
        clientName,
        contractTitle,
        statusText,
        feedback: extra.feedback || application.interview?.feedback || application.assessment?.notes,
        interviewDate: extra.interviewDate || interviewDate,
        interviewTime: extra.interviewTime || application.interview?.time,
        interviewLink: extra.interviewLink || application.interview?.link,
        assessmentTitle: extra.assessmentTitle || application.assessment?.title,
        assessmentDescription: extra.assessmentDescription || application.assessment?.description
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

    if (req.role !== "client") {
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

    if (application.applicationStatus !== "application submitted") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'application submitted' state.",
      });
    }

    application.applicationStatus = "shortlisted";

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

    if (req.role !== "client") {
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

    await notifyFreelancerStageUpdate(application, "Declined", {
      feedback: req.body.reason || req.body.feedback || req.body.notes
    });

    // In-app notification for Client
    try {
      const freelancerUser = await User.findById(application.freelancerId);
      const contract = await Contract.findById(application.contractId);
      const freelancerName = freelancerUser?.registrationDetails?.fullName || "Candidate";
      const contractTitle = contract?.contractTitle || "Contract";

      await Notification.create({
        userId: application.clientId,
        role: "client",
        title: "Application Declined",
        message: `You have declined the application from ${freelancerName} for "${contractTitle}".`,
        link: `/applicants/${application.contractId}`
      });
    } catch (notifErr) {
      console.error("Failed to notify client on rejection:", notifErr);
    }

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

    if (req.role !== "client") {
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

    if (application.applicationStatus !== "shortlisted") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'shortlisted' state.",
      });
    }

    application.applicationStatus = "assessment assigned";

    application.assessment = {
      title: req.body.title,

      description: req.body.description,

      date: req.body.date,

      status: "pending",
    };

    await application.save();

    await notifyFreelancerStageUpdate(application, "Assessment Assigned", {
      assessmentTitle: req.body.title,
      assessmentDescription: req.body.description
    });

    return res.status(200).json({
      success: true,
      message: "assessment assigned",
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

    if (req.role !== "freelancer") {
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

    if (application.applicationStatus !== "assessment assigned") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'assessment assigned' state.",
      });
    }

    application.applicationStatus = "assessment completed";
    if (req.body.notes) {
      if (!application.assessment) application.assessment = {};
      application.assessment.notes = req.body.notes;
    }
    await application.save();

    // In-app notification & Email for Client
    try {
      const freelancerUser = await User.findById(application.freelancerId);
      const clientUser = await User.findById(application.clientId);
      const contract = await Contract.findById(application.contractId);
      const freelancerName = freelancerUser?.registrationDetails?.fullName || "A freelancer";
      const clientName = clientUser?.registrationDetails?.fullName || "Client";
      const contractTitle = contract?.contractTitle || "Contract";
      const assessmentTitle = application.assessment?.title || "Assessment";

      await Notification.create({
        userId: application.clientId,
        role: "client",
        title: "Assessment Submitted",
        message: `${freelancerName} has submitted their assessment for "${contractTitle}". Please review the submission.`,
        link: `/applicants/${application.contractId}`
      });

      if (clientUser?.registrationDetails?.email) {
        await sendAssessmentSubmittedNotification(clientUser.registrationDetails.email, {
          clientName,
          freelancerName,
          contractTitle,
          contractId: application.contractId,
          assessmentTitle,
          notes: req.body.notes || application.assessment?.notes
        });
      }
    } catch (notifErr) {
      console.error("Failed to notify client on assessment submission:", notifErr);
    }

    // Confirmation notification & email to Freelancer
    await notifyFreelancerStageUpdate(application, "Assessment Submitted", {
      assessmentTitle: application.assessment?.title,
      feedback: req.body.notes
    });

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

    if (req.role !== "client") {
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

    if (application.applicationStatus !== "assessment assigned" && application.applicationStatus !== "assessment completed") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'assessment assigned' or 'assessment completed' state.",
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

    if (req.body.notes !== undefined) {
      application.assessment.notes = req.body.notes;
    }

    await application.save();

    await notifyFreelancerStageUpdate(
      application, 
      result === "passed" ? "Assessment Passed" : "Assessment Failed", 
      { feedback: req.body.notes }
    );

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

    if (req.role !== "client") {
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

    let parsedDate = req.body.date ? new Date(req.body.date) : new Date();
    if (req.body.date && req.body.time) {
      parsedDate = new Date(`${req.body.date}T${req.body.time}`);
    }

    application.interview = {
      title: req.body.title || "Interview Scheduled",
      description: req.body.description || (req.body.link ? `Meeting link: ${req.body.link}` : ""),
      date: parsedDate,
      time: req.body.time || "",
      link: req.body.link || "",
      status: "pending",
    };

    await application.save();

    const formattedDate = parsedDate.toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    // 1. Notify Freelancer (In-app + Email)
    await notifyFreelancerStageUpdate(application, "Interview Scheduled", {
      interviewDate: formattedDate,
      interviewTime: req.body.time,
      interviewLink: req.body.link,
      feedback: req.body.description
    });

    // 2. Notify Client (In-app + Email confirmation)
    try {
      const clientUser = await User.findById(application.clientId);
      const freelancerUser = await User.findById(application.freelancerId);
      const contract = await Contract.findById(application.contractId);
      const freelancerName = freelancerUser?.registrationDetails?.fullName || "Candidate";
      const contractTitle = contract?.contractTitle || "Contract";

      await Notification.create({
        userId: application.clientId,
        role: "client",
        title: "Interview Scheduled",
        message: `Interview scheduled with ${freelancerName} for "${contractTitle}" on ${formattedDate} at ${req.body.time || 'scheduled time'}.`,
        link: `/applicants/${application.contractId}`
      });

      if (clientUser?.registrationDetails?.email) {
        await sendInterviewScheduledClientNotification(clientUser.registrationDetails.email, {
          clientName: clientUser.registrationDetails.fullName,
          freelancerName,
          contractTitle,
          contractId: application.contractId,
          interviewDate: formattedDate,
          interviewTime: req.body.time,
          interviewLink: req.body.link,
          description: req.body.description
        });
      }
    } catch (clientErr) {
      console.error("Failed to notify client on interview scheduling:", clientErr);
    }

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

    if (req.role !== "client") {
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

    if (application.applicationStatus !== "interview scheduled" && application.applicationStatus !== "interview completed") {
      return res.status(400).json({
        success: false,
        message: "Invalid state transition. Application must be in 'interview scheduled' or 'interview completed' state.",
      });
    }

    application.applicationStatus = "interview completed";
    application.interview.status = "completed";

    if (req.body.feedback !== undefined) {
      application.interview.feedback = req.body.feedback;
    }

    await application.save();

    await notifyFreelancerStageUpdate(application, "Interview Completed", {
      feedback: req.body.feedback
    });

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

    if (req.role !== "client") {
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

    const result = req.body.result; // "hired" or "rejected"

    if (result === "hired") {
      application.applicationStatus = "hired";
    } else {
      application.applicationStatus = "rejected";
    }

    await application.save();

    // 1. Notify Freelancer (In-app + Email)
    await notifyFreelancerStageUpdate(
      application, 
      result === "hired" ? "Hired" : "Declined",
      { feedback: req.body.feedback || req.body.notes || application.interview?.feedback }
    );

    // 2. In-app notification for Client
    try {
      const freelancerUser = await User.findById(application.freelancerId);
      const contract = await Contract.findById(application.contractId);
      const freelancerName = freelancerUser?.registrationDetails?.fullName || "Candidate";
      const contractTitle = contract?.contractTitle || "Contract";

      await Notification.create({
        userId: application.clientId,
        role: "client",
        title: result === "hired" ? "Candidate Hired! 🎉" : "Application Closed",
        message: result === "hired"
          ? `You have selected and hired ${freelancerName} for "${contractTitle}". You can now proceed to issue a legal contract offer.`
          : `Application for ${freelancerName} on "${contractTitle}" has been closed.`,
        link: `/applicants/${application.contractId}`
      });
    } catch (notifErr) {
      console.error("Failed to notify client on application finalization:", notifErr);
    }

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
    if (application.freelancerId?._id?.toString() !== req.userId.toString() &&
        application.clientId?._id?.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const FreelancerProfile = require("../models/freelancerProfile");
    const freelancerId = application.freelancerId?._id;
    const freelancerProfile = freelancerId
      ? await FreelancerProfile.findOne({ userId: freelancerId })
      : null;

    const appObj = application.toObject();
    appObj.freelancer = {
      _id: freelancerId || null,
      fullName: freelancerProfile?.basicInformation?.fullName || application.freelancerId?.registrationDetails?.fullName || "N/A",
      email: freelancerProfile?.basicInformation?.email || application.freelancerId?.registrationDetails?.email || "N/A",
      phone: freelancerProfile?.basicInformation?.phoneNumber || freelancerProfile?.basicInformation?.phone || "N/A",
      profilePhoto: freelancerProfile?.basicInformation?.profilePhoto || "",
      professionalHeadline: freelancerProfile?.professionalDetails?.professionalHeadline || "Professional Freelancer",
      gender: freelancerProfile?.basicInformation?.gender || "N/A",
      country: freelancerProfile?.location?.country || "N/A",
      city: freelancerProfile?.location?.city || "N/A",
      availability: freelancerProfile?.professionalDetails?.availability || "N/A",
      skills: freelancerProfile?.professionalDetails?.skills || []
    };

    return res.status(200).json({ success: true, application: appObj });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInterviews = async (req, res) => {
  try {
    const role = req.role.toLowerCase();
    const query = {
      applicationStatus: { $in: ["interview scheduled", "interview completed", "hired"] },
      interview: { $exists: true }
    };
    
    if (role === "client") {
      query.clientId = req.userId;
    } else {
      query.freelancerId = req.userId;
    }

    const applications = await Application.find(query)
      .populate({
        path: role === "client" ? "freelancerId" : "clientId",
        select: "registrationDetails.fullName registrationDetails.email"
      })
      .populate({
        path: "contractId",
        select: "contractTitle"
      })
      .sort({ "interview.date": 1 });

    const interviews = applications.map(app => {
      const otherUser = role === "client" ? app.freelancerId : app.clientId;
      return {
        _id: app._id,
        interview: app.interview,
        contractTitle: app.contractId?.contractTitle,
        otherUser: {
          name: otherUser?.registrationDetails?.fullName || "User",
          email: otherUser?.registrationDetails?.email || ""
        },
        applicationStatus: app.applicationStatus
      };
    });

    return res.status(200).json({ success: true, interviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContractPDF = async (req, res) => {
  try {
    const { generatePdfFromTemplate, sendPdfResponse } = require('../helpers/pdfHelper');
    const Offer = require('../models/offer');
    
    // Find the offer for this application
    const offer = await Offer.findOne({ applicationId: req.params.id })
      .populate('clientId')
      .populate('freelancerId')
      .populate('contractId');
      
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer/Contract not found for this application' });
    }
    
    // Only client or freelancer of this offer can access
    const clientIdStr = offer.clientId?._id ? offer.clientId._id.toString() : offer.clientId?.toString();
    const freelancerIdStr = offer.freelancerId?._id ? offer.freelancerId._id.toString() : offer.freelancerId?.toString();
    const currentUserIdStr = req.userId.toString();

    if (clientIdStr !== currentUserIdStr && freelancerIdStr !== currentUserIdStr) {
      return res.status(403).json({ success: false, message: 'Unauthorized to access this contract' });
    }

    let diary = null;
    let freelancerProfile = null;
    try {
      const ContractDiary = require('../models/contractDiary');
      diary = await ContractDiary.findOne({ contractId: offer.contractId?._id || offer.contractId });
      const FreelancerProfile = require('../models/freelancerProfile');
      freelancerProfile = await FreelancerProfile.findOne({ userId: offer.freelancerId?._id || offer.freelancerId });
    } catch (e) {
      console.warn('Non-fatal: could not query contract diary or profile in applicationController:', e.message);
    }

    const { buildLegalContractData } = require('../views/data');
    const data = buildLegalContractData(offer, { diary, freelancerProfile });

    const pdfBuffer = await generatePdfFromTemplate('legal-contract.ejs', data, {
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true
    });
    sendPdfResponse(res, pdfBuffer, `contract-${offer._id}.pdf`, true);
  } catch (error) {
    console.error('Error generating contract PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to generate contract PDF' });
  }
};
