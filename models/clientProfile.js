const mongoose = require("mongoose");

const clientProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  basicInformation: {
    profilePhoto: { type: String, default: "" },
    fullName: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, default: "" },
    gender: { type: String, default: "" },
    shortBio: { type: String, default: "" }
  },
  professionalDetails: {
    companyType: { type: String, required: true },
    website: { type: String, default: "" },
    industry: { type: String, default: "" },
    companyDescription: { type: String, default: "" }
  },
  location: {
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" }
  },
  verification: {
    emailAddress: { type: Boolean, default: false },
    phoneNumber: { type: Boolean, default: false }
  },
  socialLinks: [{
    platform: { type: String, default: "" },
    profileUrl: { type: String, default: "" }
  }],
  languages: [{
    language: { type: String, default: "" },
    proficiency: { type: String, default: "" }
  }],
  savedTalents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "FreelancerProfile"
  }],
  paymentDetails: {
    bankCode: { type: String, default: "" },
    holderName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["unlinked", "pending", "verified"], default: "unlinked" },
    legalityAccepted: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model("ClientProfile", clientProfileSchema);
