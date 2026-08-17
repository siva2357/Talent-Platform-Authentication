const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Application",
    required: true
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract",
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  scopeOfWork: {
    type: String,
    default: ""
  },
  additionalTerms: {
    type: String,
    default: ""
  },
  offerStatus: {
    type: String,
    enum: ["sent", "accepted", "declined", "revoked"],
    default: "sent"
  },
  clientSignature: {
    type: String,
    default: ""
  },
  freelancerSignature: {
    type: String,
    default: ""
  },
  legalConfirmation: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: "English"
  },
  governingLaw: {
    type: String,
    default: "Indian Law"
  },
  jurisdiction: {
    type: String,
    default: "Hyderabad, India"
  },
  offerValidityDays: {
    type: Number,
    default: 7
  },
  signedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);
