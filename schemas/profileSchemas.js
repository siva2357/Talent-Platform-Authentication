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




module.exports = {
  freelancerProfileSchema,
  clientProfileSchema
};
