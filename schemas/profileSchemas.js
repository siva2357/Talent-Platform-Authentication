const Joi = require("joi");

const freelancerProfileSchema = Joi.object({
  basicInformation: Joi.object({
    fullName: Joi.string().allow(""),
    email: Joi.string().email().allow(""),
    username: Joi.string().allow(""),
    gender: Joi.string().allow(""),
    professionalHeadline: Joi.string().allow(""),
    shortBio: Joi.string().allow(""),
    profilePhoto: Joi.string().allow("")
  }).default(),
  professionalDetails: Joi.object({
    categories: Joi.array().items(Joi.string()).default([]),
    skills: Joi.array().items(Joi.string()).default([]),
    portfolio: Joi.array().items(Joi.object({
      _id: Joi.string().optional().allow(""),
      title: Joi.string().required(),
      description: Joi.string().optional().allow(""),
      role: Joi.string().optional().allow(""),
      projectType: Joi.string().optional().allow(""),
      tags: Joi.array().items(Joi.string()).default([]),
      media: Joi.array().items(Joi.object({
        _id: Joi.string().optional().allow(""),
        mediaType: Joi.string().valid("image", "video").default("image"),
        url: Joi.string().optional().allow("")
      })).default([]),
      projectUrl: Joi.string().optional().allow("")
    })).optional().default([])
  }).default(),
  location: Joi.object({
    country: Joi.string().allow(""),
    city: Joi.string().allow(""),
    timezone: Joi.string().allow("")
  }).default(),
  availability: Joi.array().items(Joi.string()).default([]),

  verification: Joi.object({
    emailAddress: Joi.boolean().default(false),
    phoneNumber: Joi.boolean().default(true)
  }).default(),
  socialLinks: Joi.array().items(Joi.object({
    _id: Joi.string().optional().allow(""),
    platform: Joi.string().allow(""),
    profileUrl: Joi.string().allow("")
  })).default([]),
  languages: Joi.array().items(Joi.object({
    _id: Joi.string().optional().allow(""),
    language: Joi.string().allow(""),
    proficiency: Joi.string().allow("")
  })).default([]),
paymentDetails: Joi.object({
  bankCode: Joi.string().allow('', null),
  bankName: Joi.string().allow('', null),

  holderName: Joi.string().allow('', null),
  accountNumber: Joi.string().allow('', null),
  ifsc: Joi.string().allow('', null),

  panNumber: Joi.string().allow('', null),
  aadhaarNumber: Joi.string().allow('', null),

  panCardUrl: Joi.string().allow('', null),
  aadhaarCardUrl: Joi.string().allow('', null),

  verified: Joi.boolean(),
  status: Joi.string().allow('', null),
  legalityAccepted: Joi.boolean()
}).default()
});

const clientProfileSchema = Joi.object({
  basicInformation: Joi.object({
    fullName: Joi.string().allow(""),
    email: Joi.string().email().allow(""),
    username: Joi.string().allow(""),
    gender: Joi.string().allow(""),
    shortBio: Joi.string().allow(""),
    profilePhoto: Joi.string().allow("")
  }).default(),
  professionalDetails: Joi.object({
    clientType: Joi.string().valid("Individual", "Startup", "Agency", "Business").default("Individual"),
    website: Joi.string().when("clientType", {
      is: Joi.string().valid("Startup", "Agency", "Business"),
      then: Joi.string().required().messages({
        "any.required": "Website is required for business profiles",
        "string.empty": "Website cannot be empty"
      }),
      otherwise: Joi.string().allow("").optional()
    }),
    industry: Joi.string().when("clientType", {
      is: Joi.string().valid("Startup", "Agency", "Business"),
      then: Joi.string().required().messages({
        "any.required": "Industry is required for business profiles",
        "string.empty": "Industry cannot be empty"
      }),
      otherwise: Joi.string().allow("").optional()
    })
  }).default(),
  location: Joi.object({
    country: Joi.string().allow(""),
    city: Joi.string().allow(""),
    timezone: Joi.string().allow("")
  }).default(),
  verification: Joi.object({
    emailAddress: Joi.boolean().default(false),
    phoneNumber: Joi.boolean().default(true)
  }).default(),
  socialLinks: Joi.array().items(Joi.object({
    _id: Joi.string().optional().allow(""),
    platform: Joi.string().allow(""),
    profileUrl: Joi.string().allow("")
  })).default([]),
  languages: Joi.array().items(Joi.object({
    _id: Joi.string().optional().allow(""),
    language: Joi.string().allow(""),
    proficiency: Joi.string().allow("")
  })).default([]),
paymentDetails: Joi.object({
  bankCode: Joi.string().allow('', null),
  bankName: Joi.string().allow('', null),

  holderName: Joi.string().allow('', null),
  accountNumber: Joi.string().allow('', null),
  ifsc: Joi.string().allow('', null),

  panNumber: Joi.string().allow('', null),
  aadhaarNumber: Joi.string().allow('', null),

  panCardUrl: Joi.string().allow('', null),
  aadhaarCardUrl: Joi.string().allow('', null),

  verified: Joi.boolean(),
  status: Joi.string().allow('', null),
  legalityAccepted: Joi.boolean()
}).default()
});

const sendPhoneOTPSchema = Joi.object({
  phoneNumber: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/).messages({
    "any.required": "Phone number is required",
    "string.empty": "Phone number cannot be empty",
    "string.pattern.base": "Please provide a valid E.164 phone number"
  })
});

const verifyPhoneOTPSchema = Joi.object({
  phoneNumber: Joi.string().required().pattern(/^\+?[1-9]\d{1,14}$/).messages({
    "any.required": "Phone number is required",
    "string.empty": "Phone number cannot be empty",
    "string.pattern.base": "Please provide a valid E.164 phone number"
  }),
  otp: Joi.string().length(6).required().messages({
    "any.required": "OTP code is required",
    "string.length": "OTP code must be exactly 6 characters long",
    "string.empty": "OTP code cannot be empty"
  })
});

module.exports = {
  freelancerProfileSchema,
  clientProfileSchema,
  sendPhoneOTPSchema,
  verifyPhoneOTPSchema
};
