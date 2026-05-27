### Phase 1 Authentication

1st folder user
user model schema for registration
    ({
  registrationDetails: {
    fullName: { type: String, required: true },
    email: { type: String, required: true, trim: true, unique: true},
    password: { type: String, required: true, select: false},
    profileCompleted: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, select: false },
    verificationCodeValidation: { type: Number, select: false }
  },
  role: { type: String, enum: ["Client", "Freelancer"]},
  status: { type: String, enum: ["active", "inactive"], default: "inactive" }

}, { timestamps: true });

2nd folder User profile -
    freelancer profile data schema 

freelancer profile schema { 

Basic Information
{
profilePhoto: url
Full Name 
Email 
Username 
Gender 
Professional Headline 
Short Bio 

}

Professional Details {
Categories - array []
Skills - array []
}

Location {Country, City, Timezone}

Availability - []

Verification {
Email Address - false
Phone Number - true
}

Social Links - array  [Platform    Profile URL ] 
Languages = array [ language, proficiency]
    
}








client profile data schema 

client profile schema { 

Basic Information
{
profilePhoto: url
Full Name 
Email 
Username 
Gender 
Short Bio 
}


Professional Details {
Client Type - enums[ Individual, Startup, Agency, Business]
Website - value
Industry - value

}

Location {Country, City, Timezone}

Verification {
Email Address - false
Phone Number - true
}
Social Links - array  [Platform    Profile URL ] 
Languages = array [ language, proficiency]
}





user flow 
user selects role go t registration page fill details go to the otp verification page enter the otp get a message that your account is created and verified then user can log in

after login only if user profile not completed redirect to the profile completion page 
fill profile data with profile picture get a message that your profile is completed and verified 
now user can access the main page