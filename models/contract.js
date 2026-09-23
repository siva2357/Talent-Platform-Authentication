const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    contractTitle: {
      type: String,
      required: true,
      trim: true
    },

    contractCategory: {
      type: String,
      trim: true
    },

    currency: {
      type: String,
      default: "INR"
    },
    estimatedBudget: {
      type: Number,
      required: true
    },

    contractStartDate: {
      type: Date,
      required: true
    },

    contractEndDate: {
      type: Date,
      required: true
    },

    contractDescription: {
      type: String,
      required: true,
      trim: true
    },

    contractType: {
      type: String,
      required: true,
      trim: true
    },

    contractSubject: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["draft", "open", "in progress", "completed", "closed"],
      default: "draft"
    },
    spent: {
      type: Number,
      default: 0
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    applicants: [

      {
        applicationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Application"
        },
        freelancerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },

        appliedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);



module.exports = mongoose.model("Contract", contractSchema);
