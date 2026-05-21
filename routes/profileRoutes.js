const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { completeProfile, getMyProfile, updateProfile, deleteProfile, sendPhoneOTP, verifyPhoneOTP } = require("../controllers/profileController");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/complete", protect, upload.single("profilePhoto"), completeProfile);
router.get("/me", protect, getMyProfile);
router.put("/update", protect, upload.single("profilePhoto"), updateProfile);
router.delete("/delete", protect, deleteProfile);

router.post("/phone/send-otp", protect, sendPhoneOTP);
router.post("/phone/verify-otp", protect, verifyPhoneOTP);

module.exports = router;
