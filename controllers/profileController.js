const User = require("../models/user");
const FreelancerProfile = require("../models/freelancerProfile");
const ClientProfile = require("../models/clientProfile");
const { uploadToGCP } = require("../utils/gcpUploader");
const { deleteFileFromGCPByUrl } = require("../utils/gcpDeleteByUrl");
const bucketMap = require("../constants/bucketMap");
const uploadSections = require("../constants/uploadSections");
const { freelancerProfileSchema, clientProfileSchema, sendPhoneOTPSchema, verifyPhoneOTPSchema } = require("../schemas/profileSchemas");
const twilio = require("twilio");

const Contract = require("../models/contract");
const Application = require("../models/application");
const Attendance = require("../models/attendance");
const ContractDiary = require("../models/contractDiary");



// Helper to get twilio client if env variables exist
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && twilioPhone && !accountSid.startsWith("YOUR_")) {
    return {
      client: twilio(accountSid, authToken),
      from: twilioPhone
    };
  }
  return null;
};

// @desc    Complete user profile with picture and metadata
// @route   POST /api/profile/complete
// @access  Private (Authenticated)
exports.completeProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;

    // Parse nested objects if they are strings (typical in multipart/form-data)
    const body = {};
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        try {
          body[key] = JSON.parse(req.body[key]);
        } catch (e) {
          body[key] = req.body[key];
        }
      } else {
        body[key] = req.body[key];
      }
    }

    // Validate using the appropriate Joi schema based on user role
    const schema = role === "Client" ? clientProfileSchema : freelancerProfileSchema;
    const { error, value: validatedData } = schema.validate(body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    let profilePhotoUrl = "";

    // 1. Check if file is uploaded
    if (req.file) {
      const bucketName = role === "Client" ? bucketMap.CLIENT_DATA : bucketMap.FREELANCER_DATA;
      const folder = role === "Client" ? uploadSections.client.PROFILE_PHOTO : uploadSections.freelancer.PROFILE_PHOTO;

      // Upload to GCP
      profilePhotoUrl = await uploadToGCP(req.file, bucketName, folder);
    } else if (validatedData.basicInformation && validatedData.basicInformation.profilePhoto) {
      // Fallback if URL already set or provided directly
      profilePhotoUrl = validatedData.basicInformation.profilePhoto;
    }

    let savedProfile;

    if (role === "Freelancer") {
      // 2. Freelancer profile compilation
      const basicInfo = validatedData.basicInformation || {};
      const professionalDetails = validatedData.professionalDetails || {};
      const location = validatedData.location || {};
      const verification = validatedData.verification || {};

      const freelancerData = {
        userId: user._id,
        basicInformation: {
          profilePhoto: profilePhotoUrl,
          fullName: basicInfo.fullName || user.registrationDetails.fullName,
          email: basicInfo.email || user.registrationDetails.email,
          username: basicInfo.username || user.registrationDetails.email.split("@")[0],
          gender: basicInfo.gender || "",
          professionalHeadline: basicInfo.professionalHeadline || "",
          shortBio: basicInfo.shortBio || ""
        },
        professionalDetails: {
          categories: professionalDetails.categories || [],
          skills: professionalDetails.skills || []
        },
        location: {
          country: location.country || "",
          city: location.city || "",
          timezone: location.timezone || ""
        },
        availability: validatedData.availability || [],
        hourlyRate: validatedData.hourlyRate || 0,
        verification: {
          emailAddress: verification.emailAddress !== undefined ? verification.emailAddress : false,
          phoneNumber: verification.phoneNumber !== undefined ? verification.phoneNumber : true
        },
        socialLinks: validatedData.socialLinks || [],
        languages: validatedData.languages || []
      };

      // Find if profile already exists or create new
      let profile = await FreelancerProfile.findOne({ userId: user._id });
      if (profile) {
        // If old profilePhoto existed and was changed, delete the old one
        if (profile.basicInformation.profilePhoto && profile.basicInformation.profilePhoto !== profilePhotoUrl) {
          try {
            await deleteFileFromGCPByUrl(profile.basicInformation.profilePhoto);
          } catch (delErr) {
            console.error("Failed to delete old profile photo from GCP:", delErr);
          }
        }
        profile = await FreelancerProfile.findOneAndUpdate({ userId: user._id }, freelancerData, { new: true, runValidators: true });
      } else {
        profile = new FreelancerProfile(freelancerData);
        await profile.save();
      }
      savedProfile = profile;

    } else if (role === "Client") {
      // 3. Client profile compilation
      const basicInfo = validatedData.basicInformation || {};
      const professionalDetails = validatedData.professionalDetails || {};
      const location = validatedData.location || {};
      const verification = validatedData.verification || {};

      const clientData = {
        userId: user._id,
        basicInformation: {
          profilePhoto: profilePhotoUrl,
          fullName: basicInfo.fullName || user.registrationDetails.fullName,
          email: basicInfo.email || user.registrationDetails.email,
          username: basicInfo.username || user.registrationDetails.email.split("@")[0],
          gender: basicInfo.gender || "",
          shortBio: basicInfo.shortBio || ""
        },
        professionalDetails: {
          clientType: professionalDetails.clientType || "Individual",
          website: professionalDetails.website || "",
          industry: professionalDetails.industry || ""
        },
        location: {
          country: location.country || "",
          city: location.city || "",
          timezone: location.timezone || ""
        },
        verification: {
          emailAddress: verification.emailAddress !== undefined ? verification.emailAddress : false,
          phoneNumber: verification.phoneNumber !== undefined ? verification.phoneNumber : true
        },
        socialLinks: validatedData.socialLinks || [],
        languages: validatedData.languages || []
      };

      // Find if profile already exists or create new
      let profile = await ClientProfile.findOne({ userId: user._id });
      if (profile) {
        // If old profilePhoto existed and was changed, delete the old one
        if (profile.basicInformation.profilePhoto && profile.basicInformation.profilePhoto !== profilePhotoUrl) {
          try {
            await deleteFileFromGCPByUrl(profile.basicInformation.profilePhoto);
          } catch (delErr) {
            console.error("Failed to delete old profile photo from GCP:", delErr);
          }
        }
        profile = await ClientProfile.findOneAndUpdate({ userId: user._id }, clientData, { new: true, runValidators: true });
      } else {
        profile = new ClientProfile(clientData);
        await profile.save();
      }
      savedProfile = profile;
    } else {
      return res.status(400).json({ success: false, message: "Invalid user role" });
    }

    // 4. Update user profileCompleted status
    user.registrationDetails.profileCompleted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "your profile is completed and verified",
      profile: savedProfile
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get logged in user profile
// @route   GET /api/profile/me
// @access  Private (Authenticated)
exports.getMyProfile = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;
    let contracts = [];
    let diaries = [];

    if (user.role === "Freelancer") {
      profile = await FreelancerProfile.findOne({ userId: user._id });
      const dbDiaries = await ContractDiary.find({ freelancerId: user._id })
        .populate("contractId")
        .populate("clientId", "registrationDetails.fullName")
        .sort({ updatedAt: -1 });

      const freelancerDiaries = [];
      for (const diary of dbDiaries) {
        if (!diary.contractId) continue;
        const c = diary.contractId;

        // Find any client feedback/review from diary phases
        let review = undefined;
        if (diary.phases) {
          // Find the last approved phase with clientFeedback
          const feedbackPhase = [...diary.phases]
            .reverse()
            .find(p => p.status === "approved" && p.clientFeedback);
          if (feedbackPhase) {
            review = feedbackPhase.clientFeedback;
          }
        }

        // Fetch attendance logs for this contract and freelancer
        const attendanceLogs = await Attendance.find({ contractId: c._id, freelancerId: user._id });
        let attendance = null;
        if (attendanceLogs && attendanceLogs.length > 0) {
          const hoursTracked = attendanceLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
          
          // Format dates
          const dates = attendanceLogs.map(log => new Date(log.date));
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          const formattedMin = minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const formattedMax = maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          
          // Calculate weekly average
          const durationMs = maxDate.getTime() - minDate.getTime();
          const durationWeeks = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24 * 7)));
          const weeklyAverage = (hoursTracked / durationWeeks).toFixed(1) + " hrs/wk";

          // Calculate attendance rate (Present or Partial status / total logs)
          const validLogs = attendanceLogs.filter(log => log.status === "Present" || log.status === "Partial").length;
          const avgAttendanceRate = Math.round((validLogs / attendanceLogs.length) * 100);

          attendance = {
            hoursTracked,
            startDate: formattedMin,
            endDate: formattedMax,
            weeklyAverage,
            avgAttendanceRate
          };
        }

        freelancerDiaries.push({
          _id: c._id,
          contractTitle: c.contractTitle,
          estimatedBudget: c.estimatedBudget,
          contractEndDate: c.contractEndDate,
          contractDescription: c.contractDescription,
          status: diary.overallStatus === "in-progress" ? "in progress" : diary.overallStatus,
          clientName: diary.clientId?.registrationDetails?.fullName || "Client",
          review,
          attendance
        });
      }
      diaries = freelancerDiaries;
    } else if (user.role === "Client") {
      profile = await ClientProfile.findOne({ userId: user._id });
      contracts = await Contract
        .find({ clientId: user._id })
        .sort({ createdAt: -1 });
    }

    const responsePayload = {
      success: true,
      user: {
        id: user._id,
        email: user.registrationDetails.email,
        fullName: user.registrationDetails.fullName,
        role: user.role,
        profileCompleted: user.registrationDetails.profileCompleted,
        emailVerified: user.registrationDetails.emailVerified,
        mobileVerification: user.registrationDetails.mobileVerification,
        phoneNumber: user.registrationDetails.phoneNumber,
        status: user.status
      },
      profile
    };

    if (user.role === "Freelancer") {
      responsePayload.diaries = diaries;
    } else if (user.role === "Client") {
      responsePayload.contracts = contracts;
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/profile/update
// @access  Private (Authenticated)
exports.updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;

    // Parse nested objects if they are strings (typical in multipart/form-data)
    const body = {};
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        try {
          body[key] = JSON.parse(req.body[key]);
        } catch (e) {
          body[key] = req.body[key];
        }
      } else {
        body[key] = req.body[key];
      }
    }

    const schema = role === "Client" ? clientProfileSchema : freelancerProfileSchema;
    const { error, value: validatedData } = schema.validate(body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    let ProfileModel = role === "Client" ? ClientProfile : FreelancerProfile;
    let profile = await ProfileModel.findOne({ userId: user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found. Please complete profile first." });
    }

    // Handle profile photo upload if present
    let profilePhotoUrl = profile.basicInformation?.profilePhoto || "";
    if (req.file) {
      const bucketName = role === "Client" ? bucketMap.CLIENT_DATA : bucketMap.FREELANCER_DATA;
      const folder = role === "Client" ? uploadSections.client.PROFILE_PHOTO : uploadSections.freelancer.PROFILE_PHOTO;

      // Upload to GCP
      profilePhotoUrl = await uploadToGCP(req.file, bucketName, folder);

      // Delete old photo if it exists
      if (profile.basicInformation?.profilePhoto && profile.basicInformation.profilePhoto !== profilePhotoUrl) {
        try {
          await deleteFileFromGCPByUrl(profile.basicInformation.profilePhoto);
        } catch (delErr) {
          console.error("Failed to delete old profile photo:", delErr);
        }
      }
    } else if (validatedData.basicInformation && validatedData.basicInformation.profilePhoto) {
      profilePhotoUrl = validatedData.basicInformation.profilePhoto;
    }

    // Merge validatedData into profile
    if (validatedData.basicInformation) {
      profile.basicInformation = {
        ...profile.basicInformation,
        ...validatedData.basicInformation,
        profilePhoto: profilePhotoUrl
      };
    }
    if (validatedData.professionalDetails) {
      profile.professionalDetails = {
        ...profile.professionalDetails,
        ...validatedData.professionalDetails
      };
    }
    if (validatedData.location) {
      profile.location = {
        ...profile.location,
        ...validatedData.location
      };
    }
    if (validatedData.verification) {
      profile.verification = {
        ...profile.verification,
        ...validatedData.verification
      };
    }
    if (validatedData.socialLinks) {
      profile.socialLinks = validatedData.socialLinks;
    }
    if (validatedData.languages) {
      profile.languages = validatedData.languages;
    }
    if (role === "Freelancer" && validatedData.availability) {
      profile.availability = validatedData.availability;
    }
    if (role === "Freelancer" && validatedData.hourlyRate !== undefined) {
      profile.hourlyRate = validatedData.hourlyRate;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user profile
// @route   DELETE /api/profile/delete
// @access  Private (Authenticated)
exports.deleteProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;

    let ProfileModel = role === "Client" ? ClientProfile : FreelancerProfile;
    const profile = await ProfileModel.findOne({ userId: user._id });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    // 1. Delete profile photo from GCP if it exists
    if (profile.basicInformation?.profilePhoto) {
      try {
        await deleteFileFromGCPByUrl(profile.basicInformation.profilePhoto);
      } catch (delErr) {
        console.error("Failed to delete profile photo from GCP:", delErr);
      }
    }

    // 2. Delete profile document
    await ProfileModel.deleteOne({ userId: user._id });

    // 3. Reset user profileCompleted status
    user.registrationDetails.profileCompleted = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send OTP to phone number
// @route   POST /api/profile/phone/send-otp
// @access  Private (Authenticated)
exports.sendPhoneOTP = async (req, res, next) => {
  try {
    const { error, value } = sendPhoneOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { phoneNumber } = value;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Save to user model
    user.registrationDetails.phoneVerificationCode = otpCode;
    user.registrationDetails.phoneVerificationCodeValidation = expiryTime;
    user.registrationDetails.phoneNumber = phoneNumber;
    await user.save();

    // Check twilio client config
    const twilioConfig = getTwilioClient();
    if (twilioConfig) {
      try {
        await twilioConfig.client.messages.create({
          body: `Your Talent-Hub mobile verification code is: ${otpCode}. Valid for 5 minutes.`,
          from: twilioConfig.from,
          to: phoneNumber
        });
      } catch (twilioErr) {
        console.error("Twilio send failed, falling back to console log:", twilioErr.message);
        console.log(`\n==============================================`);
        console.log(`[SMS MOCK] Verification Code for ${phoneNumber}: ${otpCode}`);
        console.log(`==============================================\n`);
      }
    } else {
      console.log(`\n==============================================`);
      console.log(`[SMS MOCK] Verification Code for ${phoneNumber}: ${otpCode}`);
      console.log(`==============================================\n`);
    }

    res.status(200).json({
      success: true,
      message: "Verification code sent successfully to your mobile number."
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify phone OTP code
// @route   POST /api/profile/phone/verify-otp
// @access  Private (Authenticated)
exports.verifyPhoneOTP = async (req, res, next) => {
  try {
    const { error, value } = verifyPhoneOTPSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { phoneNumber, otp } = value;
    const user = await User.findById(req.user._id).select(
      "+registrationDetails.phoneVerificationCode +registrationDetails.phoneVerificationCodeValidation"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const savedCode = user.registrationDetails.phoneVerificationCode;
    const codeExpiry = user.registrationDetails.phoneVerificationCodeValidation;

    if (!savedCode || !codeExpiry) {
      return res.status(400).json({ success: false, message: "No active verification request found" });
    }

    if (Date.now() > codeExpiry) {
      return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new one." });
    }

    if (savedCode !== otp) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    if (user.registrationDetails.phoneNumber !== phoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number mismatch. Request code again." });
    }

    // Set verified
    user.registrationDetails.mobileVerification = true;
    user.registrationDetails.phoneVerificationCode = undefined;
    user.registrationDetails.phoneVerificationCodeValidation = undefined;
    await user.save();

    // Also update verified flag inside user profile if profile exists
    let ProfileModel = user.role === "Client" ? ClientProfile : FreelancerProfile;
    const profile = await ProfileModel.findOne({ userId: user._id });
    if (profile) {
      profile.verification.phoneNumber = true;
      await profile.save();
    }

    res.status(200).json({
      success: true,
      message: "Mobile phone verified successfully."
    });
  } catch (err) {
    next(err);
  }
};
