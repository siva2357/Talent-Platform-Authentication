const { getTransporter } = require("../utils/emailSender");

// Re-export the shared lazy-loaded nodemailer transporter for backwards compatibility
module.exports = getTransporter();
