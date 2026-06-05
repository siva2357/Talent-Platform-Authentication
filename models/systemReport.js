const mongoose = require("mongoose");

const systemReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["Financial", "User Activity", "Platform Health"], required: true },
    downloadUrl: { type: String, default: "#" },
    size: { type: String, default: "120 KB" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemReport", systemReportSchema);
