const express = require("express");

const adminRoutes = require("./adminRoutes");
const authRoutes = require("./authRoutes");
const changePasswordRoutes = require("./changePasswordRoutes");
const forgotPasswordRoutes = require("./forgotPasswordRoutes");

const profileRoutes = require("./profileRoutes");
const portfolioRoutes = require("./portfolioRoutes");
const uploadRoutes = require("./uploadRoutes");
const notificationRoutes = require("./notificationRoutes");
const contractRoutes = require("./contractRoutes");
const applicationRoutes = require("./applicationRoutes");
const contractDiaryRoutes = require("./contractDiaryRoutes");

const bankRoutes = require("../routes/bankRoutes");

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/portfolio", portfolioRoutes);
router.use("/change-password", changePasswordRoutes);
router.use("/forgot-password", forgotPasswordRoutes);
router.use("/uploads", uploadRoutes);
router.use("/notifications", notificationRoutes);
router.use("/support", require("./supportRoutes"));

router.use("/contracts", contractRoutes);
router.use("/applications", applicationRoutes);
router.use("/contract-diary", contractDiaryRoutes);
router.use("/dashboard", require("./dashboardRoutes"));
router.use("/finance", require("./financeRoutes"));
router.use("/blogs", require("./blogRoutes"));

router.use('/banks', bankRoutes);

module.exports = router;
