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
        languages: validatedData.languages || [],
        paymentDetails: validatedData.paymentDetails || {}
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
        languages: validatedData.languages || [],
        paymentDetails: validatedData.paymentDetails || {}
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

        freelancerDiaries.push({
          _id: c._id,
          contractTitle: c.contractTitle,
          estimatedBudget: c.estimatedBudget,
          contractEndDate: c.contractEndDate,
          contractDescription: c.contractDescription,
          status: diary.overallStatus === "in-progress" ? "in progress" : diary.overallStatus,
          clientName: diary.clientId?.registrationDetails?.fullName || "Client",
          review
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
    if (validatedData.paymentDetails) {
      profile.paymentDetails = {
        ...profile.paymentDetails,
        ...validatedData.paymentDetails
      };
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

// @desc    Delete user profile and all associated data
// @route   DELETE /api/profile/delete
// @access  Private (Authenticated)
exports.deleteProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;

    const Transaction = require("../models/transaction");
    const Notification = require("../models/notification");
    const SupportRequest = require("../models/supportRequest");

    if (role === "Client") {
      const profile = await ClientProfile.findOne({ userId: user._id });

      // 1. Delete client profile photo from GCP
      if (profile && profile.basicInformation?.profilePhoto) {
        try {
          await deleteFileFromGCPByUrl(profile.basicInformation.profilePhoto);
        } catch (delErr) {
          console.error("Failed to delete profile photo from GCP:", delErr);
        }
      }

      // 2. Find contracts
      const contracts = await Contract.find({ clientId: user._id });
      const contractIds = contracts.map(c => c._id);

      // 3. Purge applications (signature images + database records)
      const applications = await Application.find({ contractId: { $in: contractIds } });
      for (const app of applications) {
        if (app.signatureImage) {
          try {
            await deleteFileFromGCPByUrl(app.signatureImage);
          } catch (delErr) {
            console.error("Failed to delete signature image from GCP:", delErr);
          }
        }
      }
      await Application.deleteMany({ contractId: { $in: contractIds } });
      await Application.deleteMany({ clientId: user._id });

      // 4. Purge contract diaries (attachments + database records)
      const diaries = await ContractDiary.find({ contractId: { $in: contractIds } });
      for (const diary of diaries) {
        if (diary.phases) {
          for (const phase of diary.phases) {
            if (phase.attachments) {
              for (const attach of phase.attachments) {
                if (attach.fileUrl) {
                  try {
                    await deleteFileFromGCPByUrl(attach.fileUrl);
                  } catch (delErr) {
                    console.error("Failed to delete phase attachment:", delErr);
                  }
                }
              }
            }
            if (phase.clientAttachments) {
              for (const attach of phase.clientAttachments) {
                if (attach.fileUrl) {
                  try {
                    await deleteFileFromGCPByUrl(attach.fileUrl);
                  } catch (delErr) {
                    console.error("Failed to delete client phase attachment:", delErr);
                  }
                }
              }
            }
          }
        }
      }
      await ContractDiary.deleteMany({ contractId: { $in: contractIds } });
      await ContractDiary.deleteMany({ clientId: user._id });



      // 6. Delete contracts themselves
      await Contract.deleteMany({ clientId: user._id });

      // 7. Purge support requests (attachments + database records)
      const supportRequests = await SupportRequest.find({ userId: user._id });
      for (const sr of supportRequests) {
        if (sr.attachments) {
          for (const attach of sr.attachments) {
            if (attach.url) {
              try {
                await deleteFileFromGCPByUrl(attach.url);
              } catch (delErr) {
                console.error("Failed to delete support attachment:", delErr);
              }
            }
          }
        }
      }
      await SupportRequest.deleteMany({ userId: user._id });

      // 8. Purge notifications
      await Notification.deleteMany({ userId: user._id });

      // 9. Purge transactions
      await Transaction.deleteMany({ userId: user._id });
      if (contractIds.length > 0) {
        await Transaction.deleteMany({ contractId: { $in: contractIds } });
      }

      // 10. Delete client profile document
      await ClientProfile.deleteOne({ userId: user._id });

    } else if (role === "Freelancer") {
      const profile = await FreelancerProfile.findOne({ userId: user._id });

      // 1. Delete profile photo from GCP
      if (profile && profile.basicInformation?.profilePhoto) {
        try {
          await deleteFileFromGCPByUrl(profile.basicInformation.profilePhoto);
        } catch (delErr) {
          console.error("Failed to delete profile photo from GCP:", delErr);
        }
      }

      // 2. Delete portfolio item files from GCP
      if (profile && profile.professionalDetails?.portfolio) {
        for (const item of profile.professionalDetails.portfolio) {
          if (item.media) {
            for (const mediaItem of item.media) {
              if (mediaItem.url) {
                try {
                  await deleteFileFromGCPByUrl(mediaItem.url);
                } catch (delErr) {
                  console.error("Failed to delete portfolio media from GCP:", delErr);
                }
              }
            }
          }
        }
      }

      // 3. Purge applications submitted by this freelancer
      const applications = await Application.find({ freelancerId: user._id });
      for (const app of applications) {
        if (app.signatureImage) {
          try {
            await deleteFileFromGCPByUrl(app.signatureImage);
          } catch (delErr) {
            console.error("Failed to delete signature image from GCP:", delErr);
          }
        }
      }
      await Application.deleteMany({ freelancerId: user._id });

      // 4. Purge contract diaries
      const diaries = await ContractDiary.find({ freelancerId: user._id });
      for (const diary of diaries) {
        if (diary.phases) {
          for (const phase of diary.phases) {
            if (phase.attachments) {
              for (const attach of phase.attachments) {
                if (attach.fileUrl) {
                  try {
                    await deleteFileFromGCPByUrl(attach.fileUrl);
                  } catch (delErr) {
                    console.error("Failed to delete phase attachment:", delErr);
                  }
                }
              }
            }
            if (phase.clientAttachments) {
              for (const attach of phase.clientAttachments) {
                if (attach.fileUrl) {
                  try {
                    await deleteFileFromGCPByUrl(attach.fileUrl);
                  } catch (delErr) {
                    console.error("Failed to delete client phase attachment:", delErr);
                  }
                }
              }
            }
          }
        }
      }
      await ContractDiary.deleteMany({ freelancerId: user._id });



      // 6. Purge support requests
      const supportRequests = await SupportRequest.find({ userId: user._id });
      for (const sr of supportRequests) {
        if (sr.attachments) {
          for (const attach of sr.attachments) {
            if (attach.url) {
              try {
                await deleteFileFromGCPByUrl(attach.url);
              } catch (delErr) {
                console.error("Failed to delete support attachment:", delErr);
              }
            }
          }
        }
      }
      await SupportRequest.deleteMany({ userId: user._id });

      // 7. Purge notifications
      await Notification.deleteMany({ userId: user._id });

      // 8. Purge transactions
      await Transaction.deleteMany({ userId: user._id });

      // 9. Delete freelancer profile document
      await FreelancerProfile.deleteOne({ userId: user._id });
    }

    // Finally delete user account document
    await User.deleteOne({ _id: user._id });

    res.status(200).json({
      success: true,
      message: "Account and all associated data deleted successfully"
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

// @desc    Get all completed freelancer profiles (with optional search & filter)
// @route   GET /api/profile/freelancers
// @access  Private (Authenticated)
exports.getAllFreelancers = async (req, res, next) => {
  try {
    const { search, category, minRate, maxRate } = req.query;
    
    // We only want freelancers whose user profiles are completed
    const activeFreelancers = await User.find({
      role: "Freelancer",
      "registrationDetails.profileCompleted": true
    }).select("_id status");
    
    const statusMap = {};
    activeFreelancers.forEach(u => {
      statusMap[u._id.toString()] = u.status;
    });
    
    const activeFreelancerIds = activeFreelancers.map(u => u._id);
    
    const query = {
      userId: { $in: activeFreelancerIds }
    };
    
    if (search) {
      query.$or = [
        { "basicInformation.fullName": { $regex: search, $options: "i" } },
        { "basicInformation.professionalHeadline": { $regex: search, $options: "i" } },
        { "professionalDetails.skills": { $regex: search, $options: "i" } }
      ];
    }
    
    if (category && category !== "All Categories") {
      query["professionalDetails.categories"] = category;
    }
    
    if (minRate || maxRate) {
      query.hourlyRate = {};
      if (minRate) query.hourlyRate.$gte = Number(minRate);
      if (maxRate) query.hourlyRate.$lte = Number(maxRate);
    }
    
    const freelancers = await FreelancerProfile.find(query);
    
    const freelancersWithContracts = [];
    for (const freelancer of freelancers) {
      const contractCount = await Application.countDocuments({
        freelancerId: freelancer.userId,
        offerStatus: "accepted"
      });
      const freelancerApps = await Application.find({
        freelancerId: freelancer.userId,
        offerStatus: "accepted"
      }).populate("contractId");
      const completedContractsCount = freelancerApps.filter(app => app.contractId && app.contractId.status === "completed").length;

      const plain = freelancer.toObject();
      plain.contractCount = contractCount;
      plain.completedContractsCount = completedContractsCount;
      plain.status = statusMap[freelancer.userId.toString()] || "inactive";
      freelancersWithContracts.push(plain);
    }
    
    res.status(200).json({
      success: true,
      freelancers: freelancersWithContracts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get a single freelancer profile by ID
// @route   GET /api/profile/freelancer/:id
// @access  Private (Authenticated)
exports.getFreelancerProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let profile = await FreelancerProfile.findById(id);
    if (!profile) {
      profile = await FreelancerProfile.findOne({ userId: id });
    }
    if (!profile) {
      return res.status(404).json({ success: false, message: "Freelancer profile not found" });
    }
    
    const contractCount = await Application.countDocuments({
      freelancerId: profile.userId,
      offerStatus: "accepted"
    });
    
    const freelancerUser = await User.findById(profile.userId).select("status");
    const freelancerApps = await Application.find({
      freelancerId: profile.userId,
      offerStatus: "accepted"
    }).populate("contractId");
    const completedContractsCount = freelancerApps.filter(app => app.contractId && app.contractId.status === "completed").length;

    const plainProfile = profile.toObject();
    plainProfile.contractCount = contractCount;
    plainProfile.completedContractsCount = completedContractsCount;
    plainProfile.status = freelancerUser ? freelancerUser.status : "inactive";
    
    res.status(200).json({
      success: true,
      profile: plainProfile
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Save a freelancer profile to client's bookmarks
// @route   POST /api/profile/save-talent/:id
// @access  Private (Client only)
exports.saveTalent = async (req, res, next) => {
  try {
    const clientUser = req.user;
    if (clientUser.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can save talents." });
    }
    
    const freelancerProfileId = req.params.id;
    
    const freelancerProfile = await FreelancerProfile.findById(freelancerProfileId);
    if (!freelancerProfile) {
      return res.status(404).json({ success: false, message: "Freelancer profile not found" });
    }
    
    let clientProfile = await ClientProfile.findOne({ userId: clientUser._id });
    if (!clientProfile) {
      return res.status(404).json({ success: false, message: "Client profile not found. Please complete profile first." });
    }
    
    if (clientProfile.savedTalents.includes(freelancerProfileId)) {
      return res.status(400).json({ success: false, message: "Talent already saved." });
    }
    
    clientProfile.savedTalents.push(freelancerProfileId);
    await clientProfile.save();
    
    res.status(200).json({
      success: true,
      message: "Talent saved successfully.",
      savedTalents: clientProfile.savedTalents
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove a freelancer profile from client's bookmarks
// @route   DELETE /api/profile/unsave-talent/:id
// @access  Private (Client only)
exports.unsaveTalent = async (req, res, next) => {
  try {
    const clientUser = req.user;
    if (clientUser.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can manage saved talents." });
    }
    
    const freelancerProfileId = req.params.id;
    
    let clientProfile = await ClientProfile.findOne({ userId: clientUser._id });
    if (!clientProfile) {
      return res.status(404).json({ success: false, message: "Client profile not found." });
    }
    
    clientProfile.savedTalents = clientProfile.savedTalents.filter(id => id.toString() !== freelancerProfileId.toString());
    await clientProfile.save();
    
    res.status(200).json({
      success: true,
      message: "Talent unsaved successfully.",
      savedTalents: clientProfile.savedTalents
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all saved talents for logged-in client
// @route   GET /api/profile/saved-talents
// @access  Private (Client only)
exports.getSavedTalents = async (req, res, next) => {
  try {
    const clientUser = req.user;
    if (clientUser.role !== "Client") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    
    const clientProfile = await ClientProfile.findOne({ userId: clientUser._id })
      .populate("savedTalents");
      
    if (!clientProfile) {
      return res.status(404).json({ success: false, message: "Client profile not found." });
    }
    
    const savedTalentsWithContracts = [];
    if (clientProfile.savedTalents) {
      for (const freelancer of clientProfile.savedTalents) {
        const contractCount = await Application.countDocuments({
          freelancerId: freelancer.userId,
          offerStatus: "accepted"
        });
        const freelancerApps = await Application.find({
          freelancerId: freelancer.userId,
          offerStatus: "accepted"
        }).populate("contractId");
        const completedContractsCount = freelancerApps.filter(app => app.contractId && app.contractId.status === "completed").length;

        const freelancerUser = await User.findById(freelancer.userId).select("status");
        const plain = freelancer.toObject();
        plain.contractCount = contractCount;
        plain.completedContractsCount = completedContractsCount;
        plain.status = freelancerUser ? freelancerUser.status : "inactive";
        savedTalentsWithContracts.push(plain);
      }
    }
    
    res.status(200).json({
      success: true,
      savedTalents: savedTalentsWithContracts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a project to freelancer's portfolio
// @route   POST /api/profile/portfolio
// @access  Private (Freelancer only)
exports.addPortfolioItem = async (req, res, next) => {
  try {
    const freelancerUser = req.user;
    if (freelancerUser.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can manage portfolios." });
    }
    
    const { title, description, role, projectType, tags, media, projectUrl } = req.body;
    
    if (!title) {
      return res.status(400).json({ success: false, message: "Project title is required." });
    }
    
    const profile = await FreelancerProfile.findOne({ userId: freelancerUser._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Freelancer profile not found." });
    }
    
    const newItem = {
      title,
      description: description || "",
      role: role || "",
      projectType: projectType || "",
      tags: tags || [],
      media: media || [],
      projectUrl: projectUrl || ""
    };
    
    if (!profile.professionalDetails) {
      profile.professionalDetails = { categories: [], skills: [], portfolio: [] };
    }
    if (!profile.professionalDetails.portfolio) {
      profile.professionalDetails.portfolio = [];
    }
    
    profile.professionalDetails.portfolio.push(newItem);
    await profile.save();
    
    const addedItem = profile.professionalDetails.portfolio[profile.professionalDetails.portfolio.length - 1];
    
    res.status(201).json({
      success: true,
      message: "Portfolio item added successfully.",
      item: addedItem,
      portfolio: profile.professionalDetails.portfolio
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a project in freelancer's portfolio
// @route   PUT /api/profile/portfolio/:itemId
// @access  Private (Freelancer only)
exports.updatePortfolioItem = async (req, res, next) => {
  try {
    const freelancerUser = req.user;
    if (freelancerUser.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can manage portfolios." });
    }
    
    const { itemId } = req.params;
    const { title, description, role, projectType, tags, media, projectUrl } = req.body;
    
    const profile = await FreelancerProfile.findOne({ userId: freelancerUser._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Freelancer profile not found." });
    }
    
    if (!profile.professionalDetails || !profile.professionalDetails.portfolio) {
      return res.status(404).json({ success: false, message: "Portfolio is empty." });
    }
    
    const item = profile.professionalDetails.portfolio.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Portfolio item not found." });
    }
    
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;
    if (role !== undefined) item.role = role;
    if (projectType !== undefined) item.projectType = projectType;
    if (tags !== undefined) item.tags = tags;
    if (media !== undefined) item.media = media;
    if (projectUrl !== undefined) item.projectUrl = projectUrl;
    
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: "Portfolio item updated successfully.",
      item,
      portfolio: profile.professionalDetails.portfolio
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a project from freelancer's portfolio
// @route   DELETE /api/profile/portfolio/:itemId
// @access  Private (Freelancer only)
exports.deletePortfolioItem = async (req, res, next) => {
  try {
    const freelancerUser = req.user;
    if (freelancerUser.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can manage portfolios." });
    }
    
    const { itemId } = req.params;
    
    const profile = await FreelancerProfile.findOne({ userId: freelancerUser._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Freelancer profile not found." });
    }
    
    if (!profile.professionalDetails || !profile.professionalDetails.portfolio) {
      return res.status(404).json({ success: false, message: "Portfolio is empty." });
    }
    
    profile.professionalDetails.portfolio = profile.professionalDetails.portfolio.filter(
      item => item._id.toString() !== itemId
    );
    
    await profile.save();
    
    res.status(200).json({
      success: true,
      message: "Portfolio item deleted successfully.",
      portfolio: profile.professionalDetails.portfolio
    });
  } catch (err) {
    next(err);
  }
};
