const mongoose = require("mongoose");

const timesheetDaySchema = new mongoose.Schema({
  date: { type: String, required: true }, // DD/MM/YYYY
  hours: { type: Number, default: 0 },
  attendance: {
    type: String,
    enum: ["Present", "Partial", "Absent", "Pending", "N/A"],
    default: "N/A"
  },
  faceMatch: { type: Boolean, default: false }
}, { _id: false });

const timesheetSchema = new mongoose.Schema(
  {
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    weekStartDate: {
      type: String, // YYYY-MM-DD (Monday)
      required: true
    },
    weekEndDate: {
      type: String, // YYYY-MM-DD (Sunday)
      required: true
    },
    month: {
      type: String, // e.g. "May 2026"
      required: true
    },
    week: {
      type: String, // e.g. "May 25 - May 31, 2026"
      required: true
    },
    mon: { type: timesheetDaySchema, required: true },
    tue: { type: timesheetDaySchema, required: true },
    wed: { type: timesheetDaySchema, required: true },
    thu: { type: timesheetDaySchema, required: true },
    fri: { type: timesheetDaySchema, required: true },
    sat: { type: timesheetDaySchema, required: true },
    sun: { type: timesheetDaySchema, required: true },
    total: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["Pending Approval", "Approved", "Rejected"],
      default: "Pending Approval"
    }
  },
  { timestamps: true }
);

// Ensure only one weekly timesheet exists per contract/freelancer per week
timesheetSchema.index({ contractId: 1, freelancerId: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model("Timesheet", timesheetSchema);
