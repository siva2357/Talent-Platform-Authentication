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
      status: "Unresolved",
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
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const ticket = await SupportRequest.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    ticket.status = status;
    await ticket.save();

    return res.status(200).json({ success: true, message: `Ticket status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Reply to support request (Admin only)
exports.replyToTicket = async (req, res) => {
  try {
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const ticket = await SupportRequest.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    ticket.replies.push({
      sender: "Admin",
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    
    ticket.status = "Pending"; // Mark as Pending after Admin replies
    await ticket.save();

    return res.status(200).json({ success: true, message: "Reply added successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Submit user feedback and resolve (User or Admin test simulator)
exports.submitUserFeedbackAndResolve = async (req, res) => {
  try {
    const { feedbackText } = req.body;
    if (!feedbackText) {
      return res.status(400).json({ success: false, message: "Feedback text is required" });
    }

    const ticket = await SupportRequest.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    ticket.replies.push({
      sender: "User",
      message: feedbackText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    ticket.status = "Resolved";
    await ticket.save();

    return res.status(200).json({ success: true, message: "Ticket resolved with feedback" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
