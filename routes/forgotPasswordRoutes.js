const express = require('express');
const router = express.Router();
const forgotPasswordController = require('../controllers/forgotPasswordController');

// Step 1: Send OTP
router.post('/auth/forgot-password-code', forgotPasswordController.sendForgotPasswordCode);

// Step 2: Verify OTP
router.post('/auth/verify-forgotPassword-code', forgotPasswordController.verifyForgotPasswordCode);

// Step 3: Reset Password
router.post('/auth/reset-password', forgotPasswordController.resetPassword);

module.exports = router;