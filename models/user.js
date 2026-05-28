const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  registrationDetails: {
    fullName: { type: String, required: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    profileCompleted: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    mobileVerification: { type: Boolean, default: false },
    phoneNumber: { type: String, default: "" },
    verificationCode: { type: String, select: false },
    verificationCodeValidation: { type: Number, select: false },
    phoneVerificationCode: { type: String, select: false },
    phoneVerificationCodeValidation: { type: Number, select: false },
    forgotPasswordCode: { type: String, select: false },
    forgotPasswordCodeValidation: { type: Date, select: false },
    forgotPasswordVerified: { type: Boolean, default: false }
  },
  role: { type: String, enum: ["Client", "Freelancer","Admin"], required: true },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "inactive" }
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("registrationDetails.password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.registrationDetails.password = await bcrypt.hash(this.registrationDetails.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.registrationDetails.password);
};

module.exports = mongoose.model("User", userSchema);
