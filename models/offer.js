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
  signedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);
