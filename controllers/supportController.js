const SupportRequest = require("../models/supportRequest");
const User = require("../models/user");

// Create support ticket (Client or Freelancer)
exports.createTicket = async (req, res) => {
  try {
    const { ticketId, category, subcategory, description, attachments } = req.body;
    
    if (!category || !description) {
      return res.status(400).json({ success: false, message: "Category and description are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userName = user.registrationDetails.fullName;
    const userEmail = user.registrationDetails.email;
    const userType = user.role; // 'Client' or 'Freelancer'

    const subject = `${category.charAt(0).toUpperCase() + category.slice(1)} Phase - ${subcategory || "General"}`;

    const newTicket = new SupportRequest({
      ticketId: ticketId || `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: req.userId,
      userType,
      userName,
      userEmail,
      subject,
      message: description,
      attachments: attachments || [],
      status: "Open",
      replies: []
    });

    await newTicket.save();

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      ticket: newTicket
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get user's own tickets
exports.getUserTickets = async (req, res) => {
  try {
    const tickets = await SupportRequest.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get all support tickets (Admin only)
exports.getAllTickets = async (req, res) => {
  try {
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    const tickets = await SupportRequest.find().sort({ createdAt: -1 });
    
    // Format to match frontend SupportRequest interface
    const formattedTickets = tickets.map(t => ({
      id: t.ticketId,
      userType: t.userType,
      userName: t.userName,
      userEmail: t.userEmail,
      subject: t.subject,
      message: t.message,
      attachments: t.attachments || [],
      status: t.status,
      createdDate: t.createdAt,
      replies: t.replies.map(r => ({
  sender: r.sender,
  message: r.message,
  attachments: r.attachments || [],
  timestamp: r.timestamp
}))
    }));

    return res.status(200).json(formattedTickets);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update support request status (Admin only)
exports.updateTicketStatus = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const allowedStatuses = [
      "Open",
      "WaitingForAdmin",
      "WaitingForUser",
      "Resolved",
      "Closed"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const ticket = await SupportRequest.findOne({
      ticketId: req.params.id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    ticket.status = status;

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Reply to support request (Admin only)
exports.replyToTicket = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const { message, attachments = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    const ticket = await SupportRequest.findOne({
      ticketId: req.params.id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    ticket.replies.push({
      sender: "Admin",
      message,
      attachments
    });

    ticket.status = "WaitingForUser";

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully",
      ticket
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.resolveTicket = async (req, res) => {
  try {

    const ticket = await SupportRequest.findOne({
      ticketId: req.params.id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    if (ticket.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    ticket.status = "Resolved";

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket resolved successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.replyToTicketByUser = async (req, res) => {
  try {

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }

    const ticket = await SupportRequest.findOne({
      ticketId: req.params.id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    if (ticket.userId.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    ticket.replies.push({
      sender: "User",
      message
    });

    ticket.status = "WaitingForAdmin";

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Reply submitted successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.closeTicket = async (req, res) => {
  try {

    if (req.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Admin only"
      });
    }

    const ticket = await SupportRequest.findOne({
      ticketId: req.params.id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    ticket.status = "Closed";

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket closed successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getTicketById = async (req, res) => {
  try {

    const ticket = await SupportRequest.findOne({
      ticketId: req.params.id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    if (
      req.role !== "Admin" &&
      ticket.userId.toString() !== req.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    return res.status(200).json({
      success: true,
      ticket
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};