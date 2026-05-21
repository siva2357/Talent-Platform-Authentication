const express = require("express");
const { 
  register, 
  verifyOTP, 
  login, 
  forgotPassword, 
  verifyResetOTP, 
  resetPassword 
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);

// Forgot & Reset Password routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
