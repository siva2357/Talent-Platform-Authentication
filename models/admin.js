const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    registrationDetails: {
        fullName: { type: String, required: true },
        userName: { type: String, required: true, unique: true },
        email: { type: String, required: true, trim: true, unique: true, lowercase: true },
        password: { type: String, required: true, select: false },
        profilePicture: { fileName: { type: String, required: true }, url: { type: String, required: true } },
        verified: { type: Boolean, default: true }
    },
    role: { type: String, default: 'admin' },
    lastLoginAt: { type: Date },
    lastLogoutAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);