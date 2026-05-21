const User = require("../models/user");
const { verifyOTPSchema } = require("../schemas/authSchemas");

// Reusable helper to find user and check if the OTP matches and is not expired
const verifyUserOTP = async (email, otp) => {
  const user = await User.findOne({ "registrationDetails.email": email.toLowerCase() })
    .select("+registrationDetails.verificationCode +registrationDetails.verificationCodeValidation");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const savedCode = user.registrationDetails.verificationCode;
  const codeExpiry = user.registrationDetails.verificationCodeValidation;

  if (!savedCode || !codeExpiry) {
    const error = new Error("No active verification request found");
    error.statusCode = 400;
    throw error;
  }

  if (Date.now() > codeExpiry) {
    const error = new Error("OTP has expired. Please request a new code");
    error.statusCode = 400;
    throw error;
  }

  if (savedCode !== otp) {
    const error = new Error("Invalid OTP code");
    error.statusCode = 400;
    throw error;
  }

  return user;
};

// @desc    Verify OTP for registration
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { error, value } = verifyOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, otp } = value;

    // Call the shared helper
    const user = await verifyUserOTP(email, otp);

    if (user.registrationDetails.emailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified" });
    }

    // Mark verified & activate account
    user.registrationDetails.emailVerified = true;
    user.status = "active";
    user.registrationDetails.verificationCode = undefined;
    user.registrationDetails.verificationCodeValidation = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "your account is created and verified"
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// @desc    Verify reset OTP code (generic check)
// @route   POST /api/auth/verify-reset-otp
// @access  Public
const verifyResetOTP = async (req, res, next) => {
  try {
    const { error, value } = verifyOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, otp } = value;

    // Call the shared helper
    await verifyUserOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password."
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

module.exports = {
  verifyUserOTP,
  verifyOTP,
  verifyResetOTP
};
