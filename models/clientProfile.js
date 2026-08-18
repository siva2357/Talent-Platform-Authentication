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
    companyType: { type: String, default: "" },
    website: { type: String, default: "" },
    industry: { type: String, default: "" },
    companyDescription: { type: String, default: "" }
  },
  location: {
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" },
    timezone: { type: String, default: "" }
  },
  socialLinks: [{
    platform: { type: String, default: "" },
    profileUrl: { type: String, default: "" }
  }],
  languages: [{
    language: { type: String, default: "" },
    proficiency: { type: String, default: "" }
  }]
}, { timestamps: true });

module.exports = mongoose.model("ClientProfile", clientProfileSchema);
