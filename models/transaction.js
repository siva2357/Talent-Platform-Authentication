const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      default: null
    },
    type: {
      type: String,
      enum: ["Deposit", "Escrow Funded", "Payment Released", "Withdrawal"],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["Pending", "Processed", "Paid", "Failed"],
      default: "Processed"
    },
    description: {
      type: String,
      default: ""
    },
    referenceId: {
      type: String,
      required: true
    },
    platformFee: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
