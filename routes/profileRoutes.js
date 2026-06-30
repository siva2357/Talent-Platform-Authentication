const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  completeProfile,
  getMyProfile,
  updateProfile,
  deleteProfile,
  sendPhoneOTP,
  verifyPhoneOTP,
  getAllFreelancers,
  getFreelancerProfileById,
  saveTalent,
  unsaveTalent,
  getSavedTalents,
  getProfileById,
} = require("../controllers/profileController");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/complete", protect, upload.single("profilePhoto"), completeProfile);
router.get("/me", protect, getMyProfile);
router.get("/user/:id", protect, getProfileById);
router.put("/update", protect, upload.single("profilePhoto"), updateProfile);
router.delete("/delete", protect, deleteProfile);

router.post("/phone/send-otp", protect, sendPhoneOTP);
router.post("/phone/verify-otp", protect, verifyPhoneOTP);

// Freelancer search & detail (Client & Admin / General authenticated)
router.get("/freelancers", protect, getAllFreelancers);
router.get("/freelancer/:id", protect, getFreelancerProfileById);

// Bookmarks/Saved Talents (Clients only)
router.post("/save-talent/:id", protect, saveTalent);
router.delete("/unsave-talent/:id", protect, unsaveTalent);
router.get("/saved-talents", protect, getSavedTalents);


module.exports = router;
