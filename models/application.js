const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ========================================
    // Main Status
    // ========================================

    applicationStatus: {

      type: String,

      enum: [
        "application submitted",
        "shortlisted",
        "assessment assigned",
        "assessment completed",
        "interview scheduled",
        "interview completed",
        "offer sent",
        "offer accepted",
        "hired",
        "rejected"
      ],

      default: "application submitted"

    },

    // ========================================
    // Assessment
    // ========================================

    assessment: {
      title: {
        type: String,
        default: "",
      },

      description: {
        type: String,
        default: "",
      },

      date: {
        type: Date,
      },

      score: {
        type: Number,
        default: null
      },

      notes: {
        type: String,
        default: ""
      },

      status: {
        type: String,
        enum: ["pending", "passed", "failed"],
        default: "pending"
      }

    },

    // ========================================
    // Interview
    // ========================================

    interview: {
      title: {
        type: String,
        default: "",
      },

      description: {
        type: String,
        default: "",
      },

      date: {
        type: Date,
      },

      status: {
        type: String,
        default: "pending",
      },

      feedback: {
        type: String,
        default: "",
      },
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
      enum: ["none", "sent", "accepted", "declined"],
      default: "none"
    },

    signatureImage: {
      type: String,
      default: ""
    },

    signedAt: {
      type: Date,
      default: null
    },

  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Application", applicationSchema);
