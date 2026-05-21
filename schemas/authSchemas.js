const Joi = require("joi");

const registerSchema = Joi.object({
  fullName: Joi.string().required().messages({
    "any.required": "Full name is required",
    "string.empty": "Full name cannot be empty"
  }),
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please provide a valid email address",
    "string.empty": "Email cannot be empty"
  }),
  password: Joi.string().min(6).required().messages({
    "any.required": "Password is required",
    "string.min": "Password must be at least 6 characters long",
    "string.empty": "Password cannot be empty"
  }),
  role: Joi.string().valid("Client", "Freelancer").required().messages({
    "any.required": "Role is required",
    "any.only": "Role must be either Client or Freelancer"
  })
});

const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please provide a valid email address",
    "string.empty": "Email cannot be empty"
  }),
  otp: Joi.string().length(6).required().messages({
    "any.required": "OTP code is required",
    "string.length": "OTP code must be exactly 6 characters long",
    "string.empty": "OTP code cannot be empty"
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please provide a valid email address",
    "string.empty": "Email cannot be empty"
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
    "string.empty": "Password cannot be empty"
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please provide a valid email address",
    "string.empty": "Email cannot be empty"
  })
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Please provide a valid email address",
    "string.empty": "Email cannot be empty"
  }),
  otp: Joi.string().length(6).required().messages({
    "any.required": "OTP code is required",
    "string.length": "OTP code must be exactly 6 characters long",
    "string.empty": "OTP code cannot be empty"
  }),
  newPassword: Joi.string().min(6).required().messages({
    "any.required": "New password is required",
    "string.min": "New password must be at least 6 characters long",
    "string.empty": "New password cannot be empty"
  })
});


const acceptCodeSchema = Joi.object({
  email: Joi.string().min(6).max(60).required().email({
    tlds: { allow: ['com', 'net'] }
  }),
  providedCode: Joi.number().required()
});

const acceptFpCodeSchema = Joi.object({
  email: Joi.string().min(6).max(60).required().email({ tlds: { allow: ['com', 'net'] } }),
  providedCode: Joi.number().required(),
  newPassword: Joi.string().required().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$')),
});

const changePasswordSchema = Joi.object({
  newPassword: Joi.string().required().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$')),
  oldPassword: Joi.string().required().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$'))
});

module.exports = {
  registerSchema,
  verifyOTPSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptCodeSchema,
  acceptFpCodeSchema,
  changePasswordSchema
};
