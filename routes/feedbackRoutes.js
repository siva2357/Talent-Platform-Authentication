const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const {
    identifier
} = require("../middleware/identifier");

// Submit feedback (Client only)
router.post("/submit", identifier, feedbackController.submitFeedback);

// Get feedback for a specific contract
router.get("/contract/:contractId", identifier, feedbackController.getFeedbackByContractId);

module.exports = router;
