const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
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
    overallRating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    categories: {
      qualityOfWork: { type: Number, default: 0, min: 0, max: 5 },
      requirementsAndDeliverables: { type: Number, default: 0, min: 0, max: 5 },
      communication: { type: Number, default: 0, min: 0, max: 5 },
      timeliness: { type: Number, default: 0, min: 0, max: 5 },
      behaviorAndProfessionalism: { type: Number, default: 0, min: 0, max: 5 },
    },
    clientComments: {
      type: String,
      default: "",
    },
    pros: {
      type: [String],
      default: [],
    },
    cons: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
