const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { identifier } = require("../middleware/identifier");

router.post("/tickets", identifier, supportController.createTicket);

router.get("/tickets", identifier, supportController.getUserTickets);

router.get("/tickets/:id", identifier, supportController.getTicketById);

router.post(
  "/tickets/:id/reply",
  identifier,
  supportController.replyToTicketByUser
);

router.post(
  "/tickets/:id/resolve",
  identifier,
  supportController.resolveTicket
);

router.get(
  "/admin/tickets",
  identifier,
  supportController.getAllTickets
);

router.post(
  "/admin/tickets/:id/reply",
  identifier,
  supportController.replyToTicket
);

router.patch(
  "/admin/tickets/:id/status",
  identifier,
  supportController.updateTicketStatus
);

router.post(
  "/admin/tickets/:id/close",
  identifier,
  supportController.closeTicket
);

module.exports = router;