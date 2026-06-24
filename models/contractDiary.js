const mongoose = require("mongoose");

// ========================================
// Attachment Schema
// ========================================
const attachmentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },

  fileUrl: {
    type: String,
    required: true
  },

  fileType: {
    type: String,
    default: ""
  },

  fileSize: {
    type: String,
    default: ""
  },

  uploadedAt: {
    type: Date,
    default: Date.now
  }

}, { _id: true });


// ========================================
// Revision Schema
// ========================================
const revisionSchema = new mongoose.Schema({

  freelancerNote: {
    type: String,
    default: ""
  },

  attachments: {
    type: [attachmentSchema],
    default: []
  },

  clientFeedback: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: [
      "submitted",
      "changes-requested",
      "approved"
    ],
    default: "submitted"
  },

  submittedAt: {
    type: Date,
    default: Date.now
  },

  reviewedAt: {
    type: Date,
    default: null
  }

}, {
  _id: true,
  timestamps: true
});


// ========================================
// Phase Schema
// ========================================
const phaseSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  deadline: Date,

  amount: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: [
      "pending",
      "in-progress",
      "submitted",
      "changes-requested",
      "approved",
      "overdue"
    ],
    default: "pending"
  },

  revisions: {
    type: [revisionSchema],
    default: []
  },

  revisionCount: {
    type: Number,
    default: 0
  },

  clientAttachments: {
    type: [attachmentSchema],
    default: []
  },

  approvedAt: {
    type: Date,
    default: null
  },

  submittedAt: {
    type: Date,
    default: null
  }

}, {
  _id: true,
  timestamps: true
});


// ========================================
// Contract Diary Schema
// ========================================
const contractDiarySchema = new mongoose.Schema({

  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Application",
    required: true,
    unique: true
  },

  contractId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Contract",
  required: true,
  unique: true
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

  overallStatus: {
    type: String,
    enum: [
      "not-started",
      "in-progress",
      "completed",
      "cancelled"
    ],
    default: "not-started"
  },

  phases: {
    type: [phaseSchema],
    default: []
  }

}, {
  timestamps: true
});

module.exports = mongoose.model(
  "ContractDiary",
  contractDiarySchema
);