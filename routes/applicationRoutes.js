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
  getApplicationById
} = require("../controllers/applicationController");

const {
  identifier
} = require("../middleware/identifier");


// ========================================
// Application Routes
// ========================================



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



router.get(
  "/:id",
  identifier,
  getApplicationById
);

router.get(
  "/:id/contract-pdf",
  identifier,
  require("../controllers/applicationController").getContractPDF
);

module.exports = router;