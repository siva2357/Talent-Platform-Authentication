const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ["admin", "client", "freelancer"],
        lowercase: true,
        trim: true,
        required: true,
        index: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports =
    mongoose.models.Notification ||
    mongoose.model("Notification", notificationSchema);