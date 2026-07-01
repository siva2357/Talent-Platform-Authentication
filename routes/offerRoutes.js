const express = require("express");

const router = express.Router();

const {
  createOffer,
  signOffer,
  declineOffer,
  getOfferById,
  getFreelancerOffers,
  getOfferPDF
} = require("../controllers/offerController");

const { identifier } = require("../middleware/identifier");

// Create Offer (Client only)
router.post("/:applicationId", identifier, createOffer);

// Get Freelancer's Offers
router.get("/freelancer/me", identifier, getFreelancerOffers);

// Get specific offer details
router.get("/:id", identifier, getOfferById);

// Get contract PDF for offer
router.get("/:id/pdf", getOfferPDF); // Public/Secured as needed, assuming public/download for now or can add identifier

// Sign an Offer (Freelancer only)
router.put("/:id/sign", identifier, signOffer);

// Decline an Offer (Freelancer only)
router.put("/:id/decline", identifier, declineOffer);

module.exports = router;
