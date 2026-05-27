const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null },
  location: { type: String, default: "" },
  faceImage: { type: String, default: "" },
  faceMatch: { type: Boolean, default: true }
});

const attendanceSchema = new mongoose.Schema(
  {
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true
    },
    sessions: [sessionSchema],
    totalHours: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["Present", "Partial", "Absent", "Pending"],
      default: "Pending"
    }
  },
  { timestamps: true }
);

// Unique index to prevent duplicate daily records per user per contract
attendanceSchema.index({ freelancerId: 1, contractId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
