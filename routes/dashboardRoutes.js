const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { identifier } = require("../middleware/identifier");

router.get("/stats", identifier, getDashboardStats);

module.exports = router;
