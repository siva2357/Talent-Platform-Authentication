const User = require("../models/user");
const FreelancerProfile = require("../models/freelancerProfile");
const ClientProfile = require("../models/clientProfile");
const { uploadToGCP } = require("../utils/gcpUploader");
const { deleteFileFromGCPByUrl } = require("../utils/gcpDeleteByUrl");
const { deleteFolderFromGCP } = require("../utils/gcpCleaner");
const bucketMap = require("../constants/bucketMap");
const uploadSections = require("../constants/uploadSections");
const { freelancerProfileSchema, clientProfileSchema, sendPhoneOTPSchema, verifyPhoneOTPSchema } = require("../schemas/profileSchemas");
const twilio = require("twilio");

const Contract = require("../models/contract");
const Offer = require("../models/offer");
const ContractDiary = require("../models/contractDiary");

const Portfolio = require("../models/portfolio");

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
      let folder = role === "Client" ? uploadSections.client.PROFILE_PHOTO : uploadSections.freelancer.PROFILE_PHOTO;

      const fullName = user.registrationDetails?.fullName;
      if (fullName) {
        const safeFullName = fullName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
        folder = `${safeFullName}/${folder}`;
      }

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
        .select("-applicants -savedBy -spent")
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

  const portfolio = await Portfolio.find({
    freelancerId: user._id
  }).sort({ createdAt: -1 });

  responsePayload.diaries = diaries;
  responsePayload.portfolio = portfolio;

} else if (user.role === "Client") {
      responsePayload.contracts = contracts;
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
};


exports.getProfileById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
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

        let review = undefined;
        if (diary.phases) {
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
        .select("-applicants -savedBy -spent")
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
      const portfolio = await Portfolio.find({
        freelancerId: user._id
      }).sort({ createdAt: -1 });

      responsePayload.diaries = diaries;
      responsePayload.portfolio = portfolio;
    } else if (user.role === "Client") {
      responsePayload.contracts = contracts;
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
};


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
      let folder = role === "Client" ? uploadSections.client.PROFILE_PHOTO : uploadSections.freelancer.PROFILE_PHOTO;

      const fullName = user.registrationDetails?.fullName;
      if (fullName) {
        const safeFullName = fullName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
        folder = `${safeFullName}/${folder}`;
      }

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


exports.deleteProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role;

    const Transaction = require("../models/transaction");
    const Notification = require("../models/notification");
    const SupportRequest = require("../models/supportRequest");

    const fullName = user.registrationDetails?.fullName || "";
    const safeFullName = fullName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");

    if (role === "Client") {
      const profile = await ClientProfile.findOne({ userId: user._id });

      // 1. Delete ALL client files from GCP
      if (safeFullName) {
        try {
          await deleteFolderFromGCP(bucketMap.CLIENT_DATA, safeFullName);
        } catch (delErr) {
          console.error("Failed to delete client GCP folder:", delErr);
        }
      }

      // 2. Find contracts
      const contracts = await Contract.find({ clientId: user._id });
      const contractIds = contracts.map(c => c._id);

      // 3. Purge applications (database records only)
      await Application.deleteMany({ contractId: { $in: contractIds } });
      await Application.deleteMany({ clientId: user._id });

      // 4. Purge contract diaries (database records only)
      await ContractDiary.deleteMany({ contractId: { $in: contractIds } });
      await ContractDiary.deleteMany({ clientId: user._id });

      // 5. Delete contracts themselves
      await Contract.deleteMany({ clientId: user._id });

      // 6. Purge support requests (database records only)
      await SupportRequest.deleteMany({ userId: user._id });

      // 7. Purge notifications
      await Notification.deleteMany({ userId: user._id });

      // 8. Purge transactions
      await Transaction.deleteMany({ userId: user._id });
      if (contractIds.length > 0) {
        await Transaction.deleteMany({ contractId: { $in: contractIds } });
      }

      // 9. Delete client profile document
      await ClientProfile.deleteOne({ userId: user._id });

    } else if (role === "Freelancer") {
      const profile = await FreelancerProfile.findOne({ userId: user._id });

      // 1. Delete ALL freelancer files from GCP
      if (safeFullName) {
        try {
          await deleteFolderFromGCP(bucketMap.FREELANCER_DATA, safeFullName);
        } catch (delErr) {
          console.error("Failed to delete freelancer GCP folder:", delErr);
        }
      }

      // 2. Delete portfolio records
      await Portfolio.deleteMany({ freelancerId: user._id });

      // 3. Purge applications submitted by freelancer
      await Application.deleteMany({ freelancerId: user._id });

      // 4. Purge contract diaries
      await ContractDiary.deleteMany({ freelancerId: user._id });

      // 5. Purge support requests
      await SupportRequest.deleteMany({ userId: user._id });

      // 6. Purge notifications
      await Notification.deleteMany({ userId: user._id });

      // 7. Purge transactions
      await Transaction.deleteMany({ userId: user._id });

      // 8. Delete freelancer profile
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

    // Check if phone number is already used by another user
    const existingUser = await User.findOne({ 
      "registrationDetails.phoneNumber": phoneNumber, 
      _id: { $ne: req.user._id } 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "This phone number is already associated with another account." 
      });
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

    }
    
    const freelancers = await FreelancerProfile.find(query);
    
const freelancersWithContracts = [];

for (const freelancer of freelancers) {
  const freelancerOffers = await Offer.find({
    freelancerId: freelancer.userId,
    offerStatus: "accepted",
  }).populate("contractId");

  const activeContracts = freelancerOffers.filter(
    (offer) => offer.contractId && offer.contractId.status === "in progress"
  ).length;

  const completedContracts = freelancerOffers.filter(
    (offer) => offer.contractId && offer.contractId.status === "completed"
  ).length;

  const plain = freelancer.toObject();

  freelancersWithContracts.push({
    _id: plain._id,
    userId: plain.userId,
    profilePhoto: plain.basicInformation?.profilePhoto,
    fullName: plain.basicInformation?.fullName,
    email: plain.basicInformation?.email,
    gender: plain.basicInformation?.gender,
    professionalHeadline: plain.basicInformation?.professionalHeadline,
    categories: plain.professionalDetails?.categories || [],
    skills: plain.professionalDetails?.skills || [],
    country: plain.location?.country,
    city: plain.location?.city,
    timezone: plain.location?.timezone,
    availability: plain.availability || [],

    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    activeContracts,
    completedContracts,
    status: statusMap[freelancer.userId.toString()] || "inactive",
  });
}
    
res.status(200).json({
  success: true,
  total_count: freelancersWithContracts.length,
  items: freelancersWithContracts,
});
  } catch (err) {
    next(err);
  }
};

exports.getFreelancerProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let profile = await FreelancerProfile.findById(id);

    if (!profile) {
      profile = await FreelancerProfile.findOne({
        userId: id
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Freelancer profile not found"
      });
    }

    const freelancerUser = await User.findById(
      profile.userId
    ).select("status");

    const freelancerOffers = await Offer.find({
      freelancerId: profile.userId,
      offerStatus: "accepted"
    }).populate("contractId");

    const activeContracts = freelancerOffers.filter(
      offer => offer.contractId && offer.contractId.status === "in progress"
    ).length;

    const completedContracts = freelancerOffers.filter(
      offer => offer.contractId && offer.contractId.status === "completed"
    ).length;

    const portfolio = await Portfolio.find({
      freelancerId: profile.userId
    }).sort({ createdAt: -1 });

    const plainProfile = profile.toObject();

    // Remove sensitive fields
    delete plainProfile.paymentDetails;
    delete plainProfile.verification;

    // Flatten nested objects
    const responseProfile = {
      ...plainProfile,
      ...(plainProfile.basicInformation || {}),
      ...(plainProfile.professionalDetails || {}),
      ...(plainProfile.location || {}),
      activeContracts,
      completedContracts,
      status: freelancerUser ? freelancerUser.status : "inactive"
    };

    // Remove original nested objects
    delete responseProfile.basicInformation;
    delete responseProfile.professionalDetails;
    delete responseProfile.location;

return res.status(200).json({
  requestId: req.id, // optional
  data: {
    success: true,
    profile: responseProfile,
    portfolio
  }
});
  } catch (err) {
    next(err);
  }
};

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
        const freelancerOffers = await Offer.find({
          freelancerId: freelancer.userId,
          offerStatus: "accepted"
        }).populate("contractId");

        const contractCount = freelancerOffers.filter(
          offer => offer.contractId && offer.contractId.status === "in progress"
        ).length;

        const completedContractsCount = freelancerOffers.filter(
          offer => offer.contractId && offer.contractId.status === "completed"
        ).length;

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

