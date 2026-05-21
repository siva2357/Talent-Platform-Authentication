const User = require("../models/user");
const bcrypt = require("bcrypt");
const { changePasswordSchema } = require("../schemas/authSchemas");
const transport = require("../middleware/sendMail");

exports.changePassword = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id || req.user?.userId;
        const role = req.role || req.user?.role;
        const { oldPassword, newPassword } = req.body;

        /* ================= VALIDATION ================= */
        const { error } = changePasswordSchema.validate({ oldPassword, newPassword });
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        /* ================= SELECT MODEL ================= */
        let UserModel;

        if (role?.toLowerCase() === "admin") {
            UserModel = require("../models/admin");
        } else if (role?.toLowerCase() === "client" || role?.toLowerCase() === "freelancer") {
            UserModel = User;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid user role"
            });
        }

        /* ================= FETCH USER ================= */
        const user = await UserModel
            .findById(userId)
            .select("+registrationDetails.password +registrationDetails.email +registrationDetails.emailVerified +registrationDetails.verified");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        /* ================= EMAIL VERIFIED CHECK ================= */
        const isVerified = role?.toLowerCase() === "admin"
            ? user.registrationDetails?.verified
            : user.registrationDetails?.emailVerified;

        if (!isVerified) {
            return res.status(401).json({
                success: false,
                message: "Email not verified"
            });
        }

        /* ================= VERIFY OLD PASSWORD ================= */
        const isMatch = await bcrypt.compare(
            oldPassword,
            user.registrationDetails.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Old password is incorrect"
            });
        }

        /* ================= PREVENT SAME PASSWORD ================= */
        const isSamePassword = await bcrypt.compare(
            newPassword,
            user.registrationDetails.password
        );

        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from old password"
            });
        }

        /* ================= UPDATE PASSWORD ================= */
        const salt = await bcrypt.genSalt(12);
        user.registrationDetails.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        /* ================= EMAIL NOTIFICATION ================= */
        try {
            await transport.sendMail({
                from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
                to: user.registrationDetails.email,
                subject: "Password Changed Successfully",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #4A90E2; text-align: center;">Security Alert</h2>
                        <p>Hello ${user.registrationDetails.fullName || 'User'},</p>
                        <p>Your Talent Hub account password has been successfully updated.</p>
                        <p>If you did not make this change, please contact support immediately.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                        <p style="text-align: center; color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} Talent Hub. All rights reserved.</p>
                    </div>
                `
            });
        } catch (emailErr) {
            console.error("Failed to send password change notification email:", emailErr);
        }

        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (err) {
        console.error("changePassword error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};