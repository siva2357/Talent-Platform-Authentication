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

    budgetType: {
      type: String,
      enum: ["Fixed Price", "Hourly Rate"],
      required: true
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

    status: {
      type: String,
      enum: ["pending", "in progress", "completed"],
      default: "pending"
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