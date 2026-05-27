const express = require("express");
const router = express.Router();
const { checkIn, checkOut, getTodayStatus, getAttendanceOverview } = require("../controllers/attendanceController");
const { identifier } = require("../middleware/identifier");

router.post("/check-in", identifier, checkIn);
router.post("/check-out", identifier, checkOut);
router.get("/status/:contractId", identifier, getTodayStatus);
router.get("/overview/:contractId", identifier, getAttendanceOverview);

module.exports = router;
