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
      default: 0,
      min: 0,
      max: 10,
    },
    categories: {
      qualityOfWork: { type: String, default: "" },
      requirementsAndDeliverables: { type: String, default: "" },
      communication: { type: String, default: "" },
      timeliness: { type: String, default: "" },
      behaviorAndProfessionalism: { type: String, default: "" },
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
