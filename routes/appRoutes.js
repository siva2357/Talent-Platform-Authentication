const express = require("express");

const adminRoutes = require("./adminRoutes");
const authRoutes = require("./authRoutes");
const changePasswordRoutes = require("./changePasswordRoutes");
const forgotPasswordRoutes = require("./forgotPasswordRoutes");

const profileRoutes = require("./profileRoutes");
const uploadRoutes = require("./uploadRoutes");
const notificationRoutes = require("./notificationRoutes");
const contractRoutes = require("./contractRoutes");


const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/change-password", changePasswordRoutes);
router.use("/forgot-password", forgotPasswordRoutes);
router.use("/uploads", uploadRoutes);
router.use("/notifications", notificationRoutes);

router.use("/contracts", contractRoutes);

module.exports = router;
