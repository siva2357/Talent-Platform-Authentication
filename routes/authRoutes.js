const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { 
  register, 
  verifyOTP, 
  login, 
  forgotPassword, 
  verifyResetOTP, 
  resetPassword,
  resendOTP,
  changePassword
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);

// Forgot & Reset Password routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// Change Password route (Requires Auth)
router.post("/change-password", protect, changePassword);

module.exports = router;
