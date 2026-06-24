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

    const result = req.body.result;

    if (result === "passed") {
      application.applicationStatus = "interview scheduled";

      application.assessment.status = "passed";
    } else {
      application.applicationStatus = "assessment completed";

      application.assessment.status = "failed";
    }

    await application.save();

    await notifyFreelancerStageUpdate(application, result === "passed" ? "Assessment Passed (Interview Scheduled)" : "Assessment Failed");

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

exports.sendOffer = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can send offers" });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this application" });
    }

    application.scopeOfWork = req.body.scopeOfWork || "";
    application.additionalTerms = req.body.additionalTerms || "";
    application.offerStatus = "sent";
    application.applicationStatus = "shortlisted";

    await application.save();

    await notifyFreelancerStageUpdate(application, "Contract Offer Received");

    return res.status(200).json({
      success: true,
      message: "Offer sent successfully",
      application
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.signOffer = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can sign offers" });
    }

    if (application.freelancerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to sign this application" });
    }

    application.signatureImage = req.body.signatureImage || "";
    application.offerStatus = "accepted";
    application.signedAt = new Date();

    // Change contract status in database as well if required
    const contract = await Contract.findById(application.contractId);
    if (contract) {
      contract.status = "in progress";
      await contract.save();
    }

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Contract accepted and signed successfully",
      application
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.declineOffer = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can decline offers" });
    }

    if (application.freelancerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to decline this application" });
    }

    application.offerStatus = "declined";

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Offer declined successfully",
      application
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getContractPDF = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("clientId")
      .populate("freelancerId")
      .populate("contractId");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Format dates helper
    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    };

    const ejs = require("ejs");
    const puppeteer = require("puppeteer");
    const path = require("path");

    // EJS Template Data
    const data = {
      contractTitle: application.contractId?.contractTitle || "N/A",
      agreementDate: formatDate(application.updatedAt),
      clientName: application.clientId?.registrationDetails?.fullName || "Client Name",
      clientEmail: application.clientId?.registrationDetails?.email || "",
      freelancerName: application.freelancerId?.registrationDetails?.fullName || "Freelancer Name",
      freelancerEmail: application.freelancerId?.registrationDetails?.email || "",
      estimatedBudget: `₹${application.contractId?.estimatedBudget || 0}`,
      budgetType: application.contractId?.budgetType || "Fixed Price",
      startDate: formatDate(application.contractId?.contractStartDate),
      endDate: formatDate(application.contractId?.contractEndDate),
      scopeOfWork: application.scopeOfWork || "",
      additionalTerms: application.additionalTerms || "",
      offerStatus: application.offerStatus || "none",
      signatureImage: application.signatureImage || "",
      offerSentDate: formatDate(application.createdAt),
      signedDate: formatDate(application.signedAt)
    };

    // Render EJS HTML
    const templatePath = path.join(__dirname, "..", "views", "contract-template.ejs");
    const html = await ejs.renderFile(templatePath, data);

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "20mm",
        right: "20mm"
      },
      printBackground: true
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contract_${application._id}.pdf"`);
    res.end(pdfBuffer, "binary");
    return;

  } catch (error) {
    console.error("PDF generation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFreelancerOffers = async (req, res) => {
  try {
    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access offers" });
    }

    const freelancerId = req.userId;

    const applications = await Application.find({
      freelancerId,
      offerStatus: { $in: ["sent", "accepted", "declined"] }
    })
      .populate({
        path: "contractId",
        populate: {
          path: "clientId",
          select: "registrationDetails.fullName registrationDetails.email"
        }
      })
      .sort({ updatedAt: -1 });

    const formattedOffers = applications.map(app => {
      const contract = app.contractId;
      if (!contract) return null;

      return {
        id: app._id,
        contractId: contract._id,
        contractTitle: contract.contractTitle,
        client: contract.clientId?.registrationDetails?.fullName || "Client",
        clientEmail: contract.clientId?.registrationDetails?.email || "",
        date: new Date(app.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        budget: `₹${contract.estimatedBudget}`,
        contractType: contract.budgetType === "Hourly Rate" ? "Hourly" : "Fixed Price",
        level: "Intermediate", 
        description: contract.contractDescription || "",
        techStack: ["Angular", "TypeScript", "Node.js"], 
        expiresIn: "5 Days",
        startDate: new Date(contract.contractStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: app.offerStatus === "sent" ? "Pending" : (app.offerStatus === "accepted" ? "Accepted" : "Declined"),
        contractStatus: contract.status,
        scopeOfWork: app.scopeOfWork,
        additionalTerms: app.additionalTerms,
        signatureImage: app.signatureImage,
        signedAt: app.signedAt
      };
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      offers: formattedOffers
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("clientId")
      .populate("freelancerId")
      .populate("contractId");

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
