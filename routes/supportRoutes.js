const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { identifier } = require('../middleware/identifier');

router.post("/tickets", identifier, supportController.createTicket);
router.get("/tickets", identifier, supportController.getUserTickets);
router.get("/admin/tickets", identifier, supportController.getAllTickets);
router.patch("/admin/tickets/:id/status", identifier, supportController.updateTicketStatus);
router.post("/admin/tickets/:id/reply", identifier, supportController.replyToTicket);
router.post("/tickets/:id/feedback", identifier, supportController.submitUserFeedbackAndResolve);

module.exports = router;
