const express = require("express");

const router = express.Router();

const {
  shortlistApplication,

  rejectApplication,

  scheduleAssessment,

  assessmentResult,

  scheduleInterview,

  interviewResult,
  finalizeApplication,
  submitAssessment,
  sendOffer,
  signOffer,
  declineOffer,
  getContractPDF,
  getFreelancerOffers,
  getApplicationById
} = require("../controllers/applicationController");

const {
  identifier
} = require("../middleware/identifier");


// ========================================
// Application Routes
// ========================================

router.get(
  "/my-offers",
  identifier,
  getFreelancerOffers
);

router.put(
  "/:id/shortlist",
  identifier,
  shortlistApplication
);

router.put(
  "/:id/reject",
  identifier,
  rejectApplication
);

router.put(
  "/:id/assessment",
  identifier,
  scheduleAssessment
);

router.put(
  "/:id/assessment-result",
  identifier,
  assessmentResult
);

router.put(
  "/:id/interview",
  identifier,
  scheduleInterview
);

router.put(
  "/:id/interview-result",
  identifier,
  interviewResult
);

router.put(
  "/:id/finalize",
  identifier,
  finalizeApplication
);

router.put(
  "/:id/submit-assessment",
  identifier,
  submitAssessment
);

router.put(
  "/:id/send-offer",
  identifier,
  sendOffer
);

router.put(
  "/:id/sign-offer",
  identifier,
  signOffer
);

router.put(
  "/:id/decline-offer",
  identifier,
  declineOffer
);

router.get(
  "/:id/contract-pdf",
  identifier,
  getContractPDF
);

router.get(
  "/:id",
  identifier,
  getApplicationById
);

module.exports = router;