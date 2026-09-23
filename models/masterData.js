const mongoose = require("mongoose");

const enumOptionSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, required: true }
}, { _id: false });

const masterDataSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  options: [enumOptionSchema]
}, { timestamps: true });

module.exports = mongoose.model("MasterData", masterDataSchema);
