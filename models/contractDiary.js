const mongoose = require("mongoose");

// ========================================
// Attachment Sub-Schema
// ========================================
const attachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileUrl:  { type: String, required: true },
  fileType: { type: String, default: "" },      // "pdf" | "image" | "video" | "zip" | etc.
  fileSize: { type: String, default: "" },       // e.g. "2.4 MB"
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

// ========================================
// Phase Sub-Schema
// ========================================
const phaseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  deadline: { type: Date },
  amount: { type: Number, default: 0 },

  // Status of this phase
  status: {
    type: String,
    enum: ["pending", "in-progress", "submitted", "changes-requested", "approved", "overdue"],
    default: "pending"
  },

  // Freelancer submits a progress note when updating
  freelancerNote: { type: String, default: "" },

  // Client's feedback / requested changes message
  clientFeedback: { type: String, default: "" },

  // Files attached by freelancer as proof of work
  attachments: [attachmentSchema],

  approvedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: null }

}, { _id: true, timestamps: true });

// ========================================
// Contract Diary Schema
// ========================================
const contractDiarySchema = new mongoose.Schema(
  {
    // ---- References ----
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true        // one diary per accepted application
    },

    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // ---- Overall Diary Status ----
    overallStatus: {
      type: String,
      enum: ["not-started", "in-progress", "completed", "cancelled"],
      default: "not-started"
    },

    // ---- Phases / Milestones (set up by client) ----
    phases: [phaseSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ContractDiary", contractDiarySchema);
