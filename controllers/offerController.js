const Offer = require("../models/offer");
const Application = require("../models/application");
const Contract = require("../models/contract");
const User = require("../models/user");
const Notification = require("../models/notification");
const path = require("path");
const { generatePdfFromTemplate, sendPdfResponse } = require("../helpers/pdfHelper");
const { buildContractTemplateData } = require("../views/data");
const {
  sendContractOfferEmail,
  sendOfferAcceptedNotification,
  sendOfferDeclinedNotification
} = require("../utils/emailSender");

const notifyFreelancerOfferSent = async (application, offer, statusText = "Contract Offer Received") => {
  try {
    const freelancerUser = await User.findById(application.freelancerId);
    const contract = await Contract.findById(application.contractId);
    const clientUser = await User.findById(application.clientId);
    const clientName = clientUser?.registrationDetails?.fullName || "Client";
    const freelancerName = freelancerUser?.registrationDetails?.fullName || "Freelancer";
    const contractTitle = contract?.contractTitle || "Contract Project";
    const amount = contract?.estimatedBudget;
    const scopeOfWork = offer?.scopeOfWork;
    const offerId = offer?._id;

    console.log(`[Offer Notification] Preparing notification & email for freelancer ${freelancerUser?.registrationDetails?.email || application.freelancerId}`);

    // 1. Create in-app notification
    await Notification.create({
      userId: application.freelancerId,
      role: "freelancer",
      title: "Contract Offer Received 💼",
      message: `${clientName} has sent you a legal contract offer for "${contractTitle}". Please review the terms and sign the agreement.`,
      link: offerId ? `/view-contract-offer/${offerId}` : "/proposal-offers"
    });

    // 2. Send email notification
    if (freelancerUser?.registrationDetails?.email) {
      console.log(`[Offer Email] Sending contract offer email to ${freelancerUser.registrationDetails.email}...`);
      const emailResult = await sendContractOfferEmail(freelancerUser.registrationDetails.email, {
        freelancerName,
        clientName,
        contractTitle,
        statusText: statusText || "Offer Sent",
        amount,
        scopeOfWork,
        offerId
      });
      console.log(`[Offer Email] Result for ${freelancerUser.registrationDetails.email}:`, emailResult);
    } else {
      console.warn(`[Offer Email] Freelancer with ID ${application.freelancerId} has no email address.`);
    }
  } catch (err) {
    console.error("Failed to notify freelancer of contract offer:", err);
  }
};

const notifyFreelancerStageUpdate = (application, offerOrStatus, maybeStatus) => {
  if (offerOrStatus && typeof offerOrStatus === "object" && offerOrStatus._id) {
    return notifyFreelancerOfferSent(application, offerOrStatus, maybeStatus);
  }
  return notifyFreelancerOfferSent(application, null, typeof offerOrStatus === "string" ? offerOrStatus : "Contract Offer Received");
};

exports.createOffer = async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (req.role !== "client") {
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
    application.applicationStatus = "hired";
    application.offerStatus = "sent";
    await application.save();

    await notifyFreelancerOfferSent(application, offer, "Contract Offer Received");

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

    if (req.role !== "freelancer") {
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

    // Notifications and Email on Offer Accepted & Contract Signed
    try {
      const clientUser = await User.findById(offer.clientId);
      const freelancerUser = await User.findById(offer.freelancerId);
      const clientName = clientUser?.registrationDetails?.fullName || "Client";
      const freelancerName = freelancerUser?.registrationDetails?.fullName || "Freelancer";
      const contractTitle = contract?.contractTitle || "Contract";

      // 1. In-app notification for Client
      await Notification.create({
        userId: offer.clientId,
        role: "client",
        title: "Contract Signed & Activated!",
        message: `${freelancerName} has signed the contract offer for "${contractTitle}". The contract is now active!`,
        link: "/manage-contract"
      });

      // 2. In-app notification for Freelancer
      await Notification.create({
        userId: offer.freelancerId,
        role: "freelancer",
        title: "Contract Signed Successfully",
        message: `You signed the contract agreement for "${contractTitle}". Work is now in progress!`,
        link: "/my-contracts"
      });

      // 3. Email to Client
      if (clientUser?.registrationDetails?.email) {
        await sendOfferAcceptedNotification(clientUser.registrationDetails.email, {
          recipientName: clientName,
          otherPartyName: freelancerName,
          contractTitle,
          amount: contract?.estimatedBudget,
          isClient: true
        });
      }

      // 4. Email confirmation to Freelancer
      if (freelancerUser?.registrationDetails?.email) {
        await sendOfferAcceptedNotification(freelancerUser.registrationDetails.email, {
          recipientName: freelancerName,
          otherPartyName: clientName,
          contractTitle,
          amount: contract?.estimatedBudget,
          isClient: false
        });
      }
    } catch (notifErr) {
      console.error("Failed to notify parties on offer acceptance:", notifErr);
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

    if (req.role !== "freelancer") {
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

    // Notifications and Email on Offer Declined
    try {
      const clientUser = await User.findById(offer.clientId);
      const freelancerUser = await User.findById(offer.freelancerId);
      const contract = await Contract.findById(offer.contractId);
      const clientName = clientUser?.registrationDetails?.fullName || "Client";
      const freelancerName = freelancerUser?.registrationDetails?.fullName || "Freelancer";
      const contractTitle = contract?.contractTitle || "Contract";

      // In-app notification for Client
      await Notification.create({
        userId: offer.clientId,
        role: "client",
        title: "Contract Offer Declined",
        message: `${freelancerName} has declined the contract offer for "${contractTitle}".`,
        link: "/manage-contract"
      });

      // Email to Client
      if (clientUser?.registrationDetails?.email) {
        await sendOfferDeclinedNotification(clientUser.registrationDetails.email, {
          recipientName: clientName,
          otherPartyName: freelancerName,
          contractTitle
        });
      }
    } catch (notifErr) {
      console.error("Failed to notify client on offer decline:", notifErr);
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

    // Verify ownership safely
    const freelancerIdStr = offer.freelancerId?._id?.toString() || offer.freelancerId?.toString();
    const clientIdStr = offer.clientId?._id?.toString() || offer.clientId?.toString();

    if (freelancerIdStr && clientIdStr &&
      freelancerIdStr !== req.userId.toString() &&
      clientIdStr !== req.userId.toString()) {
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
    if (req.role !== "freelancer") {
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

    const data = buildContractTemplateData(offer);

    // Generate PDF using centralized helper
    const pdfBuffer = await generatePdfFromTemplate("contract-template.ejs", data);

    // Send PDF inline so it displays in iframe and can be downloaded
    sendPdfResponse(res, pdfBuffer, `contract-${offer._id}.pdf`, true);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ success: false, message: "Failed to generate contract PDF" });
  }
};
