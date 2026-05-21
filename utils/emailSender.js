const nodemailer = require("nodemailer");

const sendVerificationEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
      pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Talent Hub" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
    to: email,
    subject: "Talent Hub - Your Verification OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">Welcome to Talent Hub!</h2>
        <p>Thank you for registering. Please verify your email using the following One-Time Password (OTP):</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background: #f5f5f5; padding: 10px 20px; border-radius: 5px; border: 1px dashed #ccc;">
            ${otp}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="text-align: center; color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} Talent Hub. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
};
