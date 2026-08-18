const Joi = require("joi");

const freelancerProfileSchema = Joi.object({
  basicInformation: Joi.object({
    fullName: Joi.string().allow(""),
    email: Joi.string().email().allow(""),
    phoneNumber: Joi.string().allow(""),
    gender: Joi.string().allow(""),
    shortBio: Joi.string().allow(""),
    profilePhoto: Joi.string().allow("")
  }).default(),
  professionalDetails: Joi.object({
    professionalHeadline: Joi.string().allow(""),
    skills: Joi.array().items(Joi.string()).default([]),
    technologies: Joi.array().items(Joi.string()).default([]),
    availability: Joi.string().allow(""),
    preferredJobType: Joi.string().allow("")
  }).default(),
  location: Joi.object({
    country: Joi.string().allow(""),
    state: Joi.string().allow(""),
    city: Joi.string().allow(""),
    timezone: Joi.string().allow("")
  }).default(),
  socialLinks: Joi.array().items(Joi.object({
    platform: Joi.string().allow(""),
    profileUrl: Joi.string().allow("")
  })).default([]),
  languages: Joi.array().items(Joi.object({
    language: Joi.string().allow(""),
    proficiency: Joi.string().allow("")
  })).default([])
});

const clientProfileSchema = Joi.object({
  basicInformation: Joi.object({
    fullName: Joi.string().allow(""),
    email: Joi.string().email().allow(""),
    phoneNumber: Joi.string().allow(""),
    gender: Joi.string().allow(""),
    shortBio: Joi.string().allow(""),
    profilePhoto: Joi.string().allow("")
  }).default(),
  professionalDetails: Joi.object({
    companyType: Joi.string().allow(""),
    website: Joi.string().allow(""),
    industry: Joi.string().allow(""),
    companyDescription: Joi.string().allow("")
  }).default(),
  location: Joi.object({
    country: Joi.string().allow(""),
    state: Joi.string().allow(""),
    city: Joi.string().allow(""),
    timezone: Joi.string().allow("")
  }).default(),
  socialLinks: Joi.array().items(Joi.object({
    platform: Joi.string().allow(""),
    profileUrl: Joi.string().allow("")
  })).default([]),
  languages: Joi.array().items(Joi.object({
    language: Joi.string().allow(""),
    proficiency: Joi.string().allow("")
  })).default([])
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
