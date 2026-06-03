const mongoose = require("mongoose");

const freelancerProfileSchema = new mongoose.Schema({
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
    username: { type: String, required: true, trim: true },
    gender: { type: String, default: "" },
    professionalHeadline: { type: String, default: "" },
    shortBio: { type: String, default: "" }
  },
  professionalDetails: {
    categories: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    portfolio: [{
      title: { type: String, required: true },
      description: { type: String, default: "" },
      role: { type: String, default: "" },
      projectType: { type: String, default: "" },
      tags: { type: [String], default: [] },
      media: [{
        mediaType: { type: String, enum: ["image", "video"], default: "image" },
        url: { type: String, default: "" }
      }],
      projectUrl: { type: String, default: "" }
    }]
  },
  location: {
    country: { type: String, default: "" },
    city: { type: String, default: "" },
    timezone: { type: String, default: "" }
  },
  availability: { type: [String], default: [] },
  hourlyRate: { type: Number, default: 0 },
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
  }]
}, { timestamps: true });

module.exports = mongoose.model("FreelancerProfile", freelancerProfileSchema);
