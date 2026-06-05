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
        "application received",
        "application shortlisted",
        "assessment scheduled",
        "assessment completed",
        "interview scheduled",
        "interview completed",
        "shortlisted",
        "rejected"
      ],

      default: "application received"

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
      status: {
        type: String,
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
