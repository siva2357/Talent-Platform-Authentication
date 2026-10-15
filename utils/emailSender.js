const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

/**
 * Lazy-loaded transporter instance to reuse SMTP connections efficiently.
 */
let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
        pass: process.env.NODE_CODE_SENDING_EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";

/**
 * Base email layout with modern, responsive styling for all device sizes (mobile, tablet, desktop).
 * Uses inline CSS with media queries for seamless rendering across Gmail, Apple Mail, Outlook, and mobile clients.
 */
function wrapEmailHtml({ title, badge, contentHtml, footerNote, accentGradient }) {
  const currentYear = new Date().getFullYear();
  const gradient = accentGradient || "linear-gradient(90deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)";
  const badgeHtml = badge
    ? `<span style="display: inline-block; background-color: #eff6ff; color: #2563eb; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 10px; border-radius: 9999px; margin-bottom: 8px;">${badge}</span>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>${title || "Talent-Hub Notification"}</title>
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }

    /* Responsive styles for mobile & tablet */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 8px 4px !important;
      }
      .main-card {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 8px !important;
      }
      .header-td {
        padding: 12px 14px !important;
      }
      .content-td {
        padding: 14px 14px !important;
      }
      .footer-td {
        padding: 12px 14px !important;
      }
      .logo-img {
        width: 58px !important;
        height: 58px !important;
      }
      .logo-td {
        width: 64px !important;
        padding-right: 10px !important;
      }
      .header-title {
        font-size: 11px !important;
      }
      .btn-cta {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 11px 16px !important;
        text-align: center !important;
      }
      .btn-container {
        margin: 12px 0 6px 0 !important;
      }
      .inner-box {
        padding: 11px !important;
        margin: 10px 0 !important;
      }
      .otp-display {
        font-size: 26px !important;
        letter-spacing: 5px !important;
      }
      .table-label {
        width: 90px !important;
        font-size: 12px !important;
      }
      .table-value {
        font-size: 12px !important;
      }
      h2.content-heading {
        font-size: 17px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; -webkit-font-smoothing: antialiased;">
  <!-- Responsive Outer Table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-wrapper" style="width: 100%; margin: 0; padding: 16px 8px; background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="main-card" style="width: 100%; max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 4px; background: ${gradient};"></td>
          </tr>

          <!-- Header with Enlarged Rounded Bordered Logo & Subtitle -->
          <tr>
            <td class="header-td" style="padding: 14px 22px; text-align: left; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="76" class="logo-td" valign="middle" style="padding-right: 14px; width: 76px;">
                    <img src="cid:talentHubLogo" alt="Talent Hub" width="70" height="70" class="logo-img" style="width: 70px; height: 70px; max-width: 100%; display: block; border: 1.5px solid #e2e8f0; border-radius: 10px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); object-fit: contain; background-color: #ffffff;" />
                  </td>
                  <td valign="middle">
                    <div class="header-title" style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; line-height: 1.4;">
                      Enterprise Talent Marketplace
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td class="content-td" style="padding: 18px 22px; word-break: break-word;">
              ${badgeHtml}
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td class="footer-td" style="padding: 14px 22px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; word-break: break-word;">
              ${footerNote ? `<p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${footerNote}</p>` : ""}
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${currentYear} Talent-Hub Inc. All rights reserved.
              </p>
              <p style="margin: 2px 0 0 0; font-size: 10px; color: #cbd5e1;">
                Secure Talent Marketplace & Verified Collaboration Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generic mail dispatcher with error handling and automatic rounded logo inline attachment.
 */
async function sendMailSafe(mailOptions) {
  try {
    const transport = getTransporter();
    const fromAddress = `"Talent-Hub" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`;

    // Automatically embed the brand logo via CID inline attachment
    const attachments = [...(mailOptions.attachments || [])];
    const logoPath = path.resolve(__dirname, "../logos/logo.png");
    if (fs.existsSync(logoPath) && !attachments.some(a => a.cid === "talentHubLogo")) {
      attachments.push({
        filename: "logo.png",
        path: logoPath,
        cid: "talentHubLogo"
      });
    }

    const finalOptions = {
      from: fromAddress,
      ...mailOptions,
      attachments
    };

    const info = await transport.sendMail(finalOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email Sending Failed:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 1. Account Verification OTP (Registration & Resend)
 */
async function sendVerificationEmail(email, otp, fullName = "") {
  const greeting = fullName ? `Hello <strong>${fullName}</strong>,` : "Hello,";
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Welcome to Talent-Hub!</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} Thank you for registering. Please verify your email address to activate your account.
    </p>

    <!-- OTP Code Box -->
    <div class="inner-box" style="text-align: center; margin: 14px 0; padding: 14px; background: #f8fafc; border: 1.5px dashed #bfdbfe; border-radius: 8px;">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">
        Your Verification Code
      </div>
      <div class="otp-display" style="font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #2563eb; font-family: monospace;">
        ${otp}
      </div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
        ⏱ Valid for 10 minutes
      </div>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748b;">
      Enter this code on the verification screen to complete your registration. If you didn't create an account, you can safely ignore this email.
    </p>
  `;

  return sendMailSafe({
    to: email,
    subject: "Talent-Hub - Verify Your Email Address",
    html: wrapEmailHtml({
      title: "Verify Your Email",
      badge: "Account Verification",
      contentHtml,
      footerNote: "Never share this verification code with anyone."
    })
  });
}

/**
 * 2. Password Reset OTP
 */
async function sendPasswordResetEmail(email, otp, fullName = "") {
  const greeting = fullName ? `Hello <strong>${fullName}</strong>,` : "Hello,";
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Password Reset Request</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} We received a request to reset your Talent-Hub password. Use the verification code below to proceed:
    </p>

    <!-- OTP Code Box -->
    <div class="inner-box" style="text-align: center; margin: 14px 0; padding: 14px; background: #fef2f2; border: 1.5px dashed #fca5a5; border-radius: 8px;">
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #991b1b; margin-bottom: 6px;">
        Password Reset Code
      </div>
      <div class="otp-display" style="font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #dc2626; font-family: monospace;">
        ${otp}
      </div>
      <div style="font-size: 11px; color: #b91c1c; margin-top: 6px;">
        ⏱ Valid for 10 minutes
      </div>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748b;">
      If you did not request a password reset, you can safely disregard this email. Your password will remain unchanged.
    </p>
  `;

  return sendMailSafe({
    to: email,
    subject: "Talent-Hub - Password Reset Code",
    html: wrapEmailHtml({
      title: "Password Reset",
      badge: "Security Alert",
      contentHtml,
      footerNote: "If you did not request this, please secure your account immediately."
    })
  });
}

/**
 * 3. Password Successfully Changed / Reset Confirmation
 */
async function sendPasswordChangedEmail(email, fullName = "") {
  const greeting = fullName ? `Hello <strong>${fullName}</strong>,` : "Hello,";
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Password Updated Successfully</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} This is a confirmation that your Talent-Hub account password has been successfully updated.
    </p>

    <div class="inner-box" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="28" valign="top">
            <span style="font-size: 20px;">🛡️</span>
          </td>
          <td style="font-size: 12px; color: #166534; padding-left: 8px;">
            <strong>Account Security Verified</strong><br/>
            Your session credentials have been updated and your account remains protected.
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748b;">
      If you made this change, no further action is needed. If you did NOT make this change, please reset your password immediately.
    </p>
  `;

  return sendMailSafe({
    to: email,
    subject: "Talent-Hub - Your Password Was Updated",
    html: wrapEmailHtml({
      title: "Password Updated",
      badge: "Security Notification",
      accentGradient: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
      contentHtml
    })
  });
}

/**
 * 4. Profile Completed & Verified Notification (Freelancer / Client)
 */
async function sendProfileCompletedEmail(email, { fullName, role, profileTitle, skills }) {
  const isFreelancer = role?.toLowerCase() === "freelancer";
  const roleLabel = isFreelancer ? "Freelancer" : "Client";
  const greeting = fullName ? `Hello <strong>${fullName}</strong>,` : "Hello,";
  const actionUrl = `${FRONTEND_URL}/user/${isFreelancer ? "contracts" : "manage-talents"}`;
  const actionText = isFreelancer ? "Browse Contracts" : "Explore Talent";

  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Your Profile is Complete & Verified! 🎉</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} Congratulations! Your <strong>${roleLabel}</strong> profile setup is complete and verified on Talent-Hub.
    </p>

    <div class="inner-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; width: 110px;">Role:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a; font-weight: 700;">${roleLabel}</td>
        </tr>
        ${
          profileTitle
            ? `<tr>
                <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600;">Title:</td>
                <td class="table-value" style="padding-bottom: 6px; color: #2563eb; font-weight: 700;">${profileTitle}</td>
              </tr>`
            : ""
        }
        ${
          skills && skills.length > 0
            ? `<tr>
                <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; vertical-align: top;">Key Skills:</td>
                <td class="table-value" style="padding-bottom: 6px; color: #334155;">${Array.isArray(skills) ? skills.join(", ") : skills}</td>
              </tr>`
            : ""
        }
        <tr>
          <td class="table-label" style="color: #64748b; font-weight: 600;">Status:</td>
          <td class="table-value">
            <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              Active & Verified
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 14px 0; font-size: 12px; color: #475569;">
      ${
        isFreelancer
          ? "Your profile is now visible to top clients. Explore open contracts and start bidding today!"
          : "Your client account is live. Post contracts, review top freelancer proposals, and hire vetted talent."
      }
    </p>

    <div class="btn-container" style="text-align: center; margin: 14px 0 6px 0;">
      <a href="${actionUrl}" class="btn-cta" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px;">
        ${actionText} →
      </a>
    </div>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - Profile Completed & Verified!`,
    html: wrapEmailHtml({
      title: "Profile Completed",
      badge: "Profile Status",
      accentGradient: "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)",
      contentHtml
    })
  });
}

/**
 * 5. Contract Offer Sent Notification
 */
async function sendContractOfferEmail(email, { freelancerName, clientName, contractTitle, statusText, amount, scopeOfWork }) {
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">New Contract Offer! 💼</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      Hello <strong>${freelancerName || "Freelancer"}</strong>, you have received a contract offer from <strong>${clientName || "the Client"}</strong>.
    </p>

    <div class="inner-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; width: 110px;">Project:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a; font-weight: 700;">${contractTitle || "Contract Project"}</td>
        </tr>
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600;">Client:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a;">${clientName || "Client"}</td>
        </tr>
        ${
          amount
            ? `<tr>
                <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600;">Budget:</td>
                <td class="table-value" style="padding-bottom: 6px; color: #059669; font-weight: 700;">₹${Number(amount).toLocaleString("en-IN")}</td>
              </tr>`
            : ""
        }
        ${
          scopeOfWork
            ? `<tr>
                <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; vertical-align: top;">Scope:</td>
                <td class="table-value" style="padding-bottom: 6px; color: #334155;">${scopeOfWork}</td>
              </tr>`
            : ""
        }
        <tr>
          <td class="table-label" style="color: #64748b; font-weight: 600;">Status:</td>
          <td class="table-value">
            <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              ${statusText || "Offer Sent"}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 14px 0; font-size: 12px; color: #64748b;">
      Please log in to your dashboard to review the full terms and sign the agreement.
    </p>

    <div class="btn-container" style="text-align: center; margin: 14px 0 6px 0;">
      <a href="${FRONTEND_URL}/user/offers" class="btn-cta" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px;">
        Review & Sign Offer →
      </a>
    </div>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - Contract Offer Received: ${contractTitle || "Project"}`,
    html: wrapEmailHtml({
      title: "Contract Offer Received",
      badge: "Contract Offer",
      contentHtml
    })
  });
}

/**
 * 6. Offer Accepted & Contract Signed Notification
 */
async function sendOfferAcceptedNotification(email, { recipientName, otherPartyName, contractTitle, amount, isClient }) {
  const greeting = recipientName ? `Hello <strong>${recipientName}</strong>,` : "Hello,";
  const mainMessage = isClient
    ? `Great news! <strong>${otherPartyName || "The freelancer"}</strong> has accepted and signed the contract offer for <strong>${contractTitle || "your project"}</strong>.`
    : `You have successfully accepted and signed the contract offer for <strong>${contractTitle || "the project"}</strong> with <strong>${otherPartyName || "the Client"}</strong>.`;

  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Contract Agreement Signed & Active! 🚀</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} ${mainMessage}
    </p>

    <div class="inner-box" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #166534; font-weight: 600; width: 110px;">Project:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a; font-weight: 700;">${contractTitle || "Contract Project"}</td>
        </tr>
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #166534; font-weight: 600;">Counterparty:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a;">${otherPartyName || "User"}</td>
        </tr>
        ${
          amount
            ? `<tr>
                <td class="table-label" style="padding-bottom: 6px; color: #166534; font-weight: 600;">Budget:</td>
                <td class="table-value" style="padding-bottom: 6px; color: #15803d; font-weight: 700;">₹${Number(amount).toLocaleString("en-IN")}</td>
              </tr>`
            : ""
        }
        <tr>
          <td class="table-label" style="color: #166534; font-weight: 600;">Status:</td>
          <td class="table-value">
            <span style="display: inline-block; background-color: #16a34a; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              In Progress
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 14px 0; font-size: 12px; color: #64748b;">
      The contract diary and milestone tracker are now unlocked. You can start tracking work and managing deliverables.
    </p>

    <div class="btn-container" style="text-align: center; margin: 14px 0 6px 0;">
      <a href="${FRONTEND_URL}/user/contracts" class="btn-cta" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px;">
        Go to Contract Workspace →
      </a>
    </div>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - Contract Signed & Activated: ${contractTitle || "Project"}`,
    html: wrapEmailHtml({
      title: "Contract Signed",
      badge: "Contract Active",
      accentGradient: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
      contentHtml
    })
  });
}

/**
 * 7. Offer Declined Notification
 */
async function sendOfferDeclinedNotification(email, { recipientName, otherPartyName, contractTitle }) {
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Contract Offer Declined</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      Hello <strong>${recipientName || "Client"}</strong>, <strong>${otherPartyName || "The freelancer"}</strong> has declined the offer for <strong>${contractTitle || "the project"}</strong>.
    </p>

    <div class="inner-box" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="color: #991b1b; font-weight: 600; width: 110px;">Project:</td>
          <td class="table-value" style="color: #0f172a; font-weight: 700;">${contractTitle || "Contract Project"}</td>
        </tr>
        <tr>
          <td class="table-label" style="color: #991b1b; font-weight: 600; padding-top: 6px;">Status:</td>
          <td class="table-value" style="padding-top: 6px;">
            <span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              Declined
            </span>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748b;">
      You can re-open discussions, review other shortlisted applicants, or extend an offer to another candidate.
    </p>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - Offer Declined: ${contractTitle || "Project"}`,
    html: wrapEmailHtml({
      title: "Offer Declined",
      badge: "Offer Update",
      accentGradient: "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)",
      contentHtml
    })
  });
}

/**
 * 8. Recruitment Stage Updated Notification (Assessment, Interview, Shortlist, etc.)
 */
async function sendApplicationStageEmail(email, { 
  freelancerName, 
  clientName, 
  contractTitle, 
  statusText, 
  feedback,
  interviewDate,
  interviewTime,
  interviewLink,
  assessmentTitle,
  assessmentDescription
}) {
  const isInterview = statusText?.toLowerCase().includes("interview");
  const isAssessment = statusText?.toLowerCase().includes("assessment");
  const isHired = statusText?.toLowerCase().includes("hired");
  const isDeclined = statusText?.toLowerCase().includes("declined") || statusText?.toLowerCase().includes("rejected");

  let badgeColor = "#ede9fe";
  let textColor = "#6d28d9";
  if (isHired) {
    badgeColor = "#dcfce7";
    textColor = "#15803d";
  } else if (isDeclined) {
    badgeColor = "#fee2e2";
    textColor = "#b91c1c";
  }

  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Application Stage Updated</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      Hello <strong>${freelancerName || "Freelancer"}</strong>, your application status for <strong>${contractTitle || "the contract"}</strong> has been updated by <strong>${clientName || "the Client"}</strong>.
    </p>

    <!-- Stage Status Box -->
    <div class="inner-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; width: 110px;">Project:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a; font-weight: 700;">${contractTitle || "Contract Project"}</td>
        </tr>
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600;">Client:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a;">${clientName || "Client"}</td>
        </tr>
        <tr>
          <td class="table-label" style="padding-bottom: ${feedback || isInterview || isAssessment ? "6px" : "0"}; color: #64748b; font-weight: 600;">Current Stage:</td>
          <td class="table-value" style="padding-bottom: ${feedback || isInterview || isAssessment ? "6px" : "0"};">
            <span style="display: inline-block; background-color: ${badgeColor}; color: ${textColor}; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              ${statusText || "Updated"}
            </span>
          </td>
        </tr>
        ${
          feedback
            ? `<tr>
                <td class="table-label" style="color: #64748b; font-weight: 600; vertical-align: top; padding-top: 4px;">Feedback:</td>
                <td class="table-value" style="color: #334155; padding-top: 4px;">${feedback}</td>
              </tr>`
            : ""
        }
      </table>
    </div>

    ${
      isInterview && (interviewDate || interviewLink)
        ? `
        <!-- Interview Details Card -->
        <div class="inner-box" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 12px 14px; margin: 12px 0;">
          <div style="font-size: 12px; font-weight: 700; color: #7e22ce; margin-bottom: 6px;">🗓 Interview Schedule Details</div>
          ${interviewDate ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 4px;"><strong>Date & Time:</strong> ${interviewDate} ${interviewTime || ""}</div>` : ""}
          ${interviewLink ? `
            <div style="margin-top: 8px;">
              <a href="${interviewLink}" class="btn-cta" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 7px 16px; border-radius: 4px;">
                Join Meeting / Call →
              </a>
            </div>` : ""}
        </div>`
        : ""
    }

    ${
      isAssessment && assessmentTitle
        ? `
        <!-- Assessment Details Card -->
        <div class="inner-box" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 14px; margin: 12px 0;">
          <div style="font-size: 12px; font-weight: 700; color: #1d4ed8; margin-bottom: 4px;">📝 Assessment Task Assigned</div>
          <div style="font-size: 12px; color: #1e3a8a; font-weight: 600;">${assessmentTitle}</div>
          ${assessmentDescription ? `<div style="font-size: 11px; color: #475569; margin-top: 3px;">${assessmentDescription}</div>` : ""}
        </div>`
        : ""
    }

    <p style="margin: 0; font-size: 12px; color: #64748b;">
      Visit your <strong>Proposals & Interviews</strong> tab to review details and respond promptly.
    </p>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - Application Update: ${contractTitle || "Project"} (${statusText})`,
    html: wrapEmailHtml({
      title: "Application Updated",
      badge: "Hiring Pipeline",
      contentHtml
    })
  });
}

/**
 * 9. Client: New Application Received Notification
 */
async function sendNewApplicationNotification(email, { clientName, freelancerName, contractTitle }) {
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">New Application Received! 🎯</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      Hello <strong>${clientName || "Client"}</strong>, a candidate has applied to your project posting:
    </p>

    <div class="inner-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; width: 110px;">Project:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a; font-weight: 700;">${contractTitle || "Contract Project"}</td>
        </tr>
        <tr>
          <td class="table-label" style="color: #64748b; font-weight: 600;">Applicant:</td>
          <td class="table-value" style="color: #2563eb; font-weight: 700;">${freelancerName || "A Freelancer"}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 14px 0; font-size: 12px; color: #64748b;">
      Review their verified portfolio, proposal bid, and experience to shortlist or schedule an assessment.
    </p>

    <div class="btn-container" style="text-align: center; margin: 14px 0 6px 0;">
      <a href="${FRONTEND_URL}/user/hired-talent?tab=offers" class="btn-cta" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px;">
        View Applicant Details →
      </a>
    </div>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - New Applicant for ${contractTitle || "Project"}`,
    html: wrapEmailHtml({
      title: "New Application",
      badge: "Hiring Pipeline",
      contentHtml
    })
  });
}

/**
 * 10. Client: Application Withdrawn Notification
 */
async function sendApplicationWithdrawnNotification(email, { clientName, freelancerName, contractTitle }) {
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Application Withdrawn</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      Hello <strong>${clientName || "Client"}</strong>, <strong>${freelancerName || "A freelancer"}</strong> has withdrawn their application for <strong>${contractTitle || "the project"}</strong>.
    </p>
    <p style="margin: 0; font-size: 12px; color: #64748b;">
      No further action is needed on your part. You can continue reviewing other active candidates for this position.
    </p>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - Application Withdrawn for ${contractTitle || "Project"}`,
    html: wrapEmailHtml({
      title: "Application Withdrawn",
      badge: "Hiring Pipeline",
      contentHtml
    })
  });
}

/**
 * 11. Support Ticket Created Confirmation
 */
async function sendSupportTicketCreatedEmail(email, { fullName, ticketId, subject, category, message }) {
  const greeting = fullName ? `Hello <strong>${fullName}</strong>,` : "Hello,";
  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Support Ticket Created 🎫</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} We have received your support request. Our customer support team will review your inquiry shortly.
    </p>

    <div class="inner-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; width: 110px;">Ticket ID:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #2563eb; font-weight: 800; font-family: monospace;">${ticketId}</td>
        </tr>
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600;">Category:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a; font-weight: 600;">${category || "General Support"}</td>
        </tr>
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600;">Subject:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a;">${subject}</td>
        </tr>
        ${
          message
            ? `<tr>
                <td class="table-label" style="color: #64748b; font-weight: 600; vertical-align: top;">Message:</td>
                <td class="table-value" style="color: #475569;">${message.length > 160 ? message.substring(0, 160) + "..." : message}</td>
              </tr>`
            : ""
        }
      </table>
    </div>

    <p style="margin: 0 0 14px 0; font-size: 12px; color: #64748b;">
      Typical response time is within <strong>24 business hours</strong>. You can view progress and reply directly from Support.
    </p>

    <div class="btn-container" style="text-align: center; margin: 14px 0 6px 0;">
      <a href="${FRONTEND_URL}/user/support" class="btn-cta" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px;">
        View Ticket Details →
      </a>
    </div>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub Support Ticket [${ticketId}] Received: ${subject}`,
    html: wrapEmailHtml({
      title: "Support Ticket Created",
      badge: "Help & Support",
      contentHtml
    })
  });
}

/**
 * 12. Support Ticket Reply Notification
 */
async function sendSupportTicketReplyEmail(email, { recipientName, ticketId, subject, senderRole, senderName, message }) {
  const greeting = recipientName ? `Hello <strong>${recipientName}</strong>,` : "Hello,";
  const senderTitle = senderRole || "Support Agent";

  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">New Reply on Support Ticket 💬</h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} You have received a new response on support ticket <strong>${ticketId}</strong>:
    </p>

    <div class="inner-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-bottom: 6px;">
        Response from ${senderTitle} ${senderName ? `(${senderName})` : ""}
      </div>
      <div style="font-size: 13px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; line-height: 1.5;">
        ${message}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 11px; margin-top: 8px;">
        <tr>
          <td style="color: #64748b;"><strong>Ticket:</strong> ${ticketId}</td>
          <td style="color: #64748b; text-align: right;"><strong>Subject:</strong> ${subject}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 14px 0; font-size: 12px; color: #64748b;">
      To reply or attach files, access your Support Center on Talent-Hub.
    </p>

    <div class="btn-container" style="text-align: center; margin: 14px 0 6px 0;">
      <a href="${FRONTEND_URL}/user/support" class="btn-cta" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px;">
        Reply to Ticket →
      </a>
    </div>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - New Reply on Ticket [${ticketId}]: ${subject}`,
    html: wrapEmailHtml({
      title: "Support Ticket Reply",
      badge: "Help & Support",
      contentHtml
    })
  });
}

/**
 * 13. Support Ticket Status Updated Notification (Resolved / Closed)
 */
async function sendSupportTicketStatusEmail(email, { fullName, ticketId, subject, status, note }) {
  const greeting = fullName ? `Hello <strong>${fullName}</strong>,` : "Hello,";
  const isResolved = status?.toLowerCase() === "resolved";

  const statusBg = isResolved ? "#f0fdf4" : "#f8fafc";
  const statusBorder = isResolved ? "#bbf7d0" : "#e2e8f0";
  const statusBadge = isResolved ? "#16a34a" : "#64748b";

  const contentHtml = `
    <h2 class="content-heading" style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
      Support Ticket ${status || "Updated"}
    </h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
      ${greeting} The status of your support ticket <strong>${ticketId}</strong> has been updated to <strong>${status}</strong>.
    </p>

    <div class="inner-box" style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 6px; padding: 14px; margin: 12px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; width: 100%;">
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600; width: 110px;">Ticket ID:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a; font-weight: 800; font-family: monospace;">${ticketId}</td>
        </tr>
        <tr>
          <td class="table-label" style="padding-bottom: 6px; color: #64748b; font-weight: 600;">Subject:</td>
          <td class="table-value" style="padding-bottom: 6px; color: #0f172a;">${subject}</td>
        </tr>
        <tr>
          <td class="table-label" style="color: #64748b; font-weight: 600;">Status:</td>
          <td class="table-value">
            <span style="display: inline-block; background-color: ${statusBadge}; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
              ${status}
            </span>
          </td>
        </tr>
        ${
          note
            ? `<tr>
                <td class="table-label" style="padding-top: 6px; color: #64748b; font-weight: 600; vertical-align: top;">Note:</td>
                <td class="table-value" style="padding-top: 6px; color: #334155;">${note}</td>
              </tr>`
            : ""
        }
      </table>
    </div>

    <p style="margin: 0; font-size: 12px; color: #64748b;">
      ${
        isResolved
          ? "If your issue is resolved, no further action is necessary. If you still need help, feel free to reopen the ticket."
          : "Thank you for using Talent-Hub support. If you need any further assistance, you can open a new ticket anytime."
      }
    </p>
  `;

  return sendMailSafe({
    to: email,
    subject: `Talent-Hub - Ticket [${ticketId}] Status: ${status}`,
    html: wrapEmailHtml({
      title: `Ticket ${status}`,
      badge: "Help & Support",
      accentGradient: isResolved ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : undefined,
      contentHtml
    })
  });
}

module.exports = {
  getTransporter,
  sendMailSafe,
  wrapEmailHtml,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendProfileCompletedEmail,
  sendContractOfferEmail,
  sendOfferAcceptedNotification,
  sendOfferDeclinedNotification,
  sendApplicationStageEmail,
  sendNewApplicationNotification,
  sendApplicationWithdrawnNotification,
  sendSupportTicketCreatedEmail,
  sendSupportTicketReplyEmail,
  sendSupportTicketStatusEmail
};
