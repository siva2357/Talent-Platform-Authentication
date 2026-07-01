const Offer = require("../models/offer");
const Application = require("../models/application");
const Contract = require("../models/contract");
const User = require("../models/user");
const Notification = require("../models/notification");
const sendMail = require("../middleware/sendMail");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

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
      link: "/user/offers"
    });

    // 2. Send email notification
    if (freelancerUser?.registrationDetails?.email) {
      await sendMail.sendMail({
        from: `"Talent Hub" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
        to: freelancerUser.registrationDetails.email,
        subject: "Talent Hub - Contract Offer Received",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4A90E2; text-align: center;">Contract Offer Received</h2>
            <p>Hello ${freelancerUser.registrationDetails.fullName},</p>
            <p>You have received a new contract offer for <strong>${contract?.contractTitle || 'Contract'}</strong> from the client.</p>
            <p><strong>Status:</strong> ${statusText}</p>
            <p>Please log in to your account and go to the Offers tab to view the details and sign the contract.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
            <p style="text-align: center; color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} Talent Hub. All rights reserved.</p>
          </div>
        `
      });
    }
  } catch (err) {
    console.error("Failed to notify freelancer stage update:", err);
  }
};

exports.createOffer = async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can send offers" });
    }

    if (application.clientId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to send offer for this application" });
    }

    // Check if an offer already exists for this application
    const existingOffer = await Offer.findOne({ applicationId: application._id });
    if (existingOffer && existingOffer.offerStatus !== 'declined' && existingOffer.offerStatus !== 'revoked') {
        return res.status(400).json({ success: false, message: "An active offer already exists for this application" });
    }

    const offer = new Offer({
      applicationId: application._id,
      contractId: application.contractId,
      clientId: application.clientId,
      freelancerId: application.freelancerId,
      scopeOfWork: req.body.scopeOfWork || "",
      additionalTerms: req.body.additionalTerms || "",
      clientSignature: req.body.clientSignature || "",
      offerStatus: "sent"
    });

    await offer.save();

    // Update Application Status
    application.applicationStatus = "shortlisted";
    await application.save();

    await notifyFreelancerStageUpdate(application, "Contract Offer Received");

    return res.status(200).json({
      success: true,
      message: "Offer sent successfully",
      offer
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.signOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can sign offers" });
    }

    if (offer.freelancerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to sign this offer" });
    }

    if (offer.offerStatus !== "sent") {
      return res.status(400).json({ success: false, message: "This offer cannot be signed in its current status." });
    }

    offer.freelancerSignature = req.body.freelancerSignature || "";
    offer.offerStatus = "accepted";
    offer.signedAt = new Date();
    await offer.save();

    // Update contract status
    const contract = await Contract.findById(offer.contractId);
    if (contract) {
      contract.status = "in progress";
      await contract.save();
    }

    // Update application status
    const application = await Application.findById(offer.applicationId);
    if (application) {
      application.applicationStatus = "hired";
      await application.save();
    }

    return res.status(200).json({
      success: true,
      message: "Contract accepted and signed successfully",
      offer
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.declineOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can decline offers" });
    }

    if (offer.freelancerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to decline this offer" });
    }

    offer.offerStatus = "declined";
    await offer.save();

    // Update application status
    const Application = require("../models/application");
    const application = await Application.findById(offer.applicationId);
    if (application) {
      application.applicationStatus = "rejected";
      await application.save();
    }

    return res.status(200).json({
      success: true,
      message: "Offer declined successfully",
      offer
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
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

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    // Verify ownership
    if (offer.freelancerId._id.toString() !== req.userId.toString() &&
        offer.clientId._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    return res.status(200).json({ success: true, offer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFreelancerOffers = async (req, res) => {
  try {
    const freelancerId = req.userId;
    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access this route" });
    }

    const offers = await Offer.find({
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

    const formattedOffers = offers.map(offer => {
      const contract = offer.contractId;
      if (!contract) return null;

      return {
        id: offer._id,
        applicationId: offer.applicationId,
        contractId: contract._id,
        contractTitle: contract.contractTitle,
        client: contract.clientId?.registrationDetails?.fullName || "Client",
        clientEmail: contract.clientId?.registrationDetails?.email || "",
        date: new Date(offer.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        budget: `₹${contract.estimatedBudget}`,
        contractType: contract.budgetType === "Hourly Rate" ? "Hourly" : "Fixed Price",
        level: "Intermediate", 
        description: contract.contractDescription || "",
        techStack: ["Angular", "TypeScript", "Node.js"], 
        expiresIn: "5 Days",
        startDate: new Date(contract.contractStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: offer.offerStatus === "sent" ? "Pending" : (offer.offerStatus === "accepted" ? "Accepted" : "Declined"),
        contractStatus: contract.status,
        scopeOfWork: offer.scopeOfWork,
        additionalTerms: offer.additionalTerms,
        freelancerSignature: offer.freelancerSignature,
        signedAt: offer.signedAt
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

exports.getOfferPDF = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("clientId")
      .populate("freelancerId")
      .populate("contractId");

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
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

    // EJS Template Data
    const data = {
      contractTitle: offer.contractId?.contractTitle || "N/A",
      agreementDate: formatDate(offer.updatedAt),
      clientName: offer.clientId?.registrationDetails?.fullName || "Client Name",
      clientEmail: offer.clientId?.registrationDetails?.email || "",
      freelancerName: offer.freelancerId?.registrationDetails?.fullName || "Freelancer Name",
      freelancerEmail: offer.freelancerId?.registrationDetails?.email || "",
      estimatedBudget: `₹${offer.contractId?.estimatedBudget || 0}`,
      budgetType: offer.contractId?.budgetType || "Fixed Price",
      startDate: formatDate(offer.contractId?.contractStartDate),
      endDate: formatDate(offer.contractId?.contractEndDate),
      scopeOfWork: offer.scopeOfWork || "",
      additionalTerms: offer.additionalTerms || "",
      offerStatus: offer.offerStatus || "none",
      clientSignature: offer.clientSignature || "",
      freelancerSignature: offer.freelancerSignature || "",
      offerSentDate: formatDate(offer.createdAt),
      signedDate: formatDate(offer.signedAt)
    };

    // Render EJS HTML
    const templatePath = path.join(__dirname, "..", "views", "contract-template.ejs");
    const html = await ejs.renderFile(templatePath, data);

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" }
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=contract-${offer._id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ success: false, message: "Failed to generate contract PDF" });
  }
};
