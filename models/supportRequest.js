const mongoose = require("mongoose");

const supportRequestReplySchema = new mongoose.Schema({
  sender: { type: String, enum: ["Admin", "User"], required: true },
  message: { type: String, required: true },
  timestamp: { type: String, required: true }
}, { timestamps: true });

const supportRequestSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userType: { type: String, enum: ["Client", "Freelancer"], required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  attachments: [{
    name: { type: String },
    url: { type: String }
  }],
  status: { type: String, enum: ["Pending", "Resolved", "Unresolved"], default: "Unresolved" },
  replies: [supportRequestReplySchema]
}, { timestamps: true });

module.exports = mongoose.model("SupportRequest", supportRequestSchema);
