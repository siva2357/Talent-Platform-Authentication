const User = require("../models/user");
const { sendVerificationEmail } = require("../utils/emailSender");
const jwt = require("jsonwebtoken");
const { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} = require("../schemas/authSchemas");
const { verifyUserOTP, verifyOTP, verifyResetOTP } = require("./otpController");

// Helper to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Re-export OTP controllers so they can be imported from authController
exports.verifyOTP = verifyOTP;
exports.verifyResetOTP = verifyResetOTP;

// @desc    Register a new user (generates & sends OTP)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { fullName, email, password, role } = value;
    const lowerEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({ "registrationDetails.email": lowerEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    // Generate 6-digit verification code & validation time (valid for 10 minutes)
    const verificationCode = generateOTP();
    const verificationCodeValidation = Date.now() + 10 * 60 * 1000;

    const user = new User({
      registrationDetails: {
        fullName,
        email: lowerEmail,
        password,
        verificationCode,
        verificationCodeValidation,
        emailVerified: false,
        profileCompleted: false,
        mobileVerification: false
      },
      role,
      status: "inactive"
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(lowerEmail, verificationCode);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify the OTP sent to your email.",
      email: lowerEmail
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, password } = value;
    const lowerEmail = email.toLowerCase();

    // Find user and include password field for verification
    let user = await User.findOne({ "registrationDetails.email": lowerEmail }).select("+registrationDetails.password");
    let isAdmin = false;

    // If not found in User, check Admin collection
    if (!user) {
      const AdminModel = require("../models/admin");
      user = await AdminModel.findOne({ "registrationDetails.email": lowerEmail }).select("+registrationDetails.password");
      if (user) {
        isAdmin = true;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (isAdmin) {
      const bcrypt = require("bcrypt");
      const isMatch = await bcrypt.compare(password, user.registrationDetails.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      if (user.registrationDetails.verified === false) {
         return res.status(403).json({ success: false, message: "Admin account is not verified" });
      }

      const token = generateToken(user);
      return res.status(200).json({
        success: true,
        token,
        role: user.role || "Admin",
        profileCompleted: true,
        mobileVerification: true
      });
    }

    // Normal User Flow
    // Check if account is verified
    if (!user.registrationDetails.emailVerified || user.status !== "active") {
      return res.status(403).json({ success: false, message: "Please verify your email before logging in" });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      role: user.role,
      profileCompleted: user.registrationDetails.profileCompleted,
      mobileVerification: user.registrationDetails.mobileVerification
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email } = value;
    const lowerEmail = email.toLowerCase();

    const user = await User.findOne({ "registrationDetails.email": lowerEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate reset OTP code & validation time (valid for 10 minutes)
    const resetOTP = generateOTP();
    user.registrationDetails.verificationCode = resetOTP;
    user.registrationDetails.verificationCodeValidation = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Send email with reset OTP
    try {
      await sendVerificationEmail(lowerEmail, resetOTP);
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr);
    }

    res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      email: lowerEmail
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, otp, newPassword } = value;
    
    // Call shared helper to verify the OTP is still valid
    const user = await verifyUserOTP(email, otp);

    // Update password and clear OTP
    user.registrationDetails.password = newPassword;
    user.registrationDetails.verificationCode = undefined;
    user.registrationDetails.verificationCodeValidation = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password."
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};
