const Joi = require('joi');
const User = require("../models/user");
const transport = require("../middleware/sendMail");
const { hmacProcess } = require("../utils/hashing");
const bcrypt = require('bcrypt');

exports.sendForgotPasswordCode = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();

    try {

        const user = await User.findOne({ 'registrationDetails.email': email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User with this email does not exist"
            });
        }

        const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedCodeValue = hmacProcess(
            codeValue,
            process.env.HMAC_VERIFICATION_CODE_SECRET
        );

        await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: email,
            subject: "OTP for Password Reset",
            html: `<h2>Your OTP is: ${codeValue}</h2>`
        });

        user.registrationDetails.forgotPasswordCode = hashedCodeValue;
        user.registrationDetails.forgotPasswordCodeValidation = Date.now();
        user.registrationDetails.forgotPasswordVerified = false;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });

    } catch (err) {
        console.error("sendForgotPasswordCode error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.verifyForgotPasswordCode = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const { providedCode } = req.body;

    try {
        const user = await User.findOne({ 'registrationDetails.email': email })
            .select("+registrationDetails.forgotPasswordCode +registrationDetails.forgotPasswordCodeValidation");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const savedCode = user.registrationDetails.forgotPasswordCode;
        const codeTime = user.registrationDetails.forgotPasswordCodeValidation;

        if (!savedCode || !codeTime) {
            return res.status(400).json({
                success: false,
                message: "No password reset requested or code has expired"
            });
        }

        // Check if expired (e.g. 10 minutes)
        if (Date.now() - new Date(codeTime).getTime() > 10 * 60 * 1000) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new code"
            });
        }

        const hashed = hmacProcess(
            providedCode.toString(),
            process.env.HMAC_VERIFICATION_CODE_SECRET
        );

        if (savedCode !== hashed) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP code"
            });
        }

        user.registrationDetails.forgotPasswordVerified = true;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully"
        });

    } catch (err) {
        console.error("verifyForgotPasswordCode error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.resetPassword = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const { newPassword } = req.body;

    try {
        const user = await User.findOne({ 'registrationDetails.email': email })
            .select("+registrationDetails.forgotPasswordVerified");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.registrationDetails.forgotPasswordVerified) {
            return res.status(400).json({
                success: false,
                message: "Please verify your OTP code first before resetting password"
            });
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Weak password"
            });
        }

        const salt = await bcrypt.genSalt(12);
        user.registrationDetails.password = await bcrypt.hash(newPassword, salt);
        user.registrationDetails.forgotPasswordCode = undefined;
        user.registrationDetails.forgotPasswordCodeValidation = undefined;
        user.registrationDetails.forgotPasswordVerified = false;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });

    } catch (err) {
        console.error("resetPassword error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
