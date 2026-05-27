const express = require("express");
const router = express.Router();
const { getClientTimesheets, approveTimesheet } = require("../controllers/timesheetController");
const { identifier } = require("../middleware/identifier");

router.get("/client", identifier, getClientTimesheets);
router.put("/:id/approve", identifier, approveTimesheet);

module.exports = router;
