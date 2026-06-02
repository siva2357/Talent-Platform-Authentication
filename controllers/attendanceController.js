const Attendance = require("../models/attendance");
const Contract = require("../models/contract");
const Application = require("../models/application");

// Helper: Calculate week boundaries and names
function getWeekRange(dateObj) {
  const date = new Date(dateObj);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const pad = (num) => String(num).padStart(2, "0");
  const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  const months = ["May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April"];
  // Map index correctly
  const fullMonths = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const monStr = `${shortMonths[monday.getMonth()]} ${pad(monday.getDate())}`;
  const sunStr = `${shortMonths[sunday.getMonth()]} ${pad(sunday.getDate())}, ${sunday.getFullYear()}`;
  
  return {
    weekStartDate: formatDate(monday),
    weekEndDate: formatDate(sunday),
    week: `${monStr} - ${sunStr}`,
    month: `${fullMonths[monday.getMonth()]} ${monday.getFullYear()}`,
    mondayDate: monday
  };
}

// Format date to local YYYY-MM-DD
function formatLocalDate(date) {
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ==========================================
// FREELANCER: Punch In
// POST /api/attendance/check-in
// Body: { contractId, location, faceImage, faceMatch }
// ==========================================
exports.checkIn = async (req, res) => {
  try {
    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can mark attendance" });
    }

    const { contractId, location } = req.body;
    if (!contractId) {
      return res.status(400).json({ success: false, message: "contractId is required" });
    }

    const freelancerId = req.userId;
    const todayStr = formatLocalDate(new Date());

    // Check if contract exists and is active for this freelancer
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    // Find or create daily attendance
    let attendance = await Attendance.findOne({
      freelancerId,
      contractId,
      date: todayStr
    });

    if (!attendance) {
      attendance = new Attendance({
        freelancerId,
        contractId,
        date: todayStr,
        sessions: [],
        totalHours: 0,
        status: "Pending"
      });
    }

    // Prevent checking in if there's already an active (un-closed) session
    const activeSession = attendance.sessions.find(s => s.checkOut === null);
    if (activeSession) {
      return res.status(400).json({ 
        success: false, 
        message: "You are already checked in. Please check out first.",
        session: activeSession
      });
    }

    // Push new check-in session
    attendance.sessions.push({
      checkIn: new Date(),
      location: location || "Unknown Location"
    });

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Checked in successfully",
      attendance
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FREELANCER: Punch Out
// POST /api/attendance/check-out
// Body: { contractId }
// ==========================================
exports.checkOut = async (req, res) => {
  try {
    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can mark attendance" });
    }

    const { contractId } = req.body;
    if (!contractId) {
      return res.status(400).json({ success: false, message: "contractId is required" });
    }

    const freelancerId = req.userId;
    const todayStr = formatLocalDate(new Date());

    // Find daily attendance
    const attendance = await Attendance.findOne({
      freelancerId,
      contractId,
      date: todayStr
    });

    if (!attendance) {
      return res.status(404).json({ success: false, message: "No attendance record found for today. Please check in first." });
    }

    // Find active session
    const activeSession = attendance.sessions.find(s => s.checkOut === null);
    if (!activeSession) {
      return res.status(400).json({ success: false, message: "You are not checked in. Please check in first." });
    }

    // Update session checkout
    activeSession.checkOut = new Date();

    // Recalculate daily total hours
    let dailyHours = 0;
    attendance.sessions.forEach(s => {
      if (s.checkIn && s.checkOut) {
        const diffMs = new Date(s.checkOut) - new Date(s.checkIn);
        const diffHrs = diffMs / (1000 * 60 * 60);
        dailyHours += diffHrs;
      }
    });

    attendance.totalHours = parseFloat(dailyHours.toFixed(2));
    attendance.status = attendance.totalHours >= 8 ? "Present" : "Partial";

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Checked out successfully",
      attendance
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FREELANCER: Today's Status
// GET /api/attendance/status/:contractId
// ==========================================
exports.getTodayStatus = async (req, res) => {
  try {
    const { contractId } = req.params;
    const freelancerId = req.userId;
    const todayStr = formatLocalDate(new Date());

    const attendance = await Attendance.findOne({
      freelancerId,
      contractId,
      date: todayStr
    });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        isCheckedIn: false,
        totalLoggedToday: 0,
        currentSessionStart: null,
        sessions: []
      });
    }

    const activeSession = attendance.sessions.find(s => s.checkOut === null);

    return res.status(200).json({
      success: true,
      isCheckedIn: !!activeSession,
      totalLoggedToday: attendance.totalHours,
      currentSessionStart: activeSession ? activeSession.checkIn : null,
      sessions: attendance.sessions
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FREELANCER: Historical Attendance Logs
// GET /api/attendance/overview/:contractId
// ==========================================
exports.getAttendanceOverview = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.userId;
    const role = req.role;

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    let query = { contractId };

    if (role === "Freelancer") {
      // Find accepted application for this freelancer on this contract
      const application = await Application.findOne({
        contractId: contract._id,
        freelancerId: userId,
        offerStatus: "accepted"
      });
      if (!application) {
        return res.status(403).json({ success: false, message: "Unauthorized: You are not the hired freelancer on this contract" });
      }
      query.freelancerId = userId;
    } else if (role === "Client") {
      if (contract.clientId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized: You are not the owner of this contract" });
      }
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    const logs = await Attendance.find(query).sort({ date: -1 });
    
    // Group logs by month dynamically
    const monthsMap = {};
    const fullMonths = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];

    logs.forEach(log => {
      const parts = log.date.split("-"); // YYYY-MM-DD
      const dateObj = new Date(log.date);
      const monthName = `${fullMonths[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      
      if (!monthsMap[monthName]) {
        monthsMap[monthName] = {
          contractTitle: contract ? contract.contractTitle : "Active Contract",
          month: monthName,
          totalHours: 0,
          daysPresent: 0,
          status: contract ? (contract.status === "in progress" ? "In Progress" : "Completed") : "Active",
          id: `CON-${contractId.toString().slice(-5).toUpperCase()}`,
          logs: []
        };
      }

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      
      const formattedLogSessions = log.sessions.map(s => {
        const formatTime = (t) => {
          if (!t) return "---";
          const d = new Date(t);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
        const calcHrs = (s.checkIn && s.checkOut) ? parseFloat(((new Date(s.checkOut) - new Date(s.checkIn)) / (1000 * 60 * 60)).toFixed(2)) : 0;
        return {
          checkIn: formatTime(s.checkIn),
          checkOut: formatTime(s.checkOut),
          hours: calcHrs,
          location: s.location,
          faceImage: s.faceImage
        };
      });

      const dayName = daysOfWeek[dateObj.getDay()];
      const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

      monthsMap[monthName].logs.push({
        rawDate: log.date, // Format: YYYY-MM-DD
        date: formattedDate,
        day: dayName,
        sessions: formattedLogSessions,
        totalHours: log.totalHours,
        status: log.totalHours >= 8 ? "Attended" : (log.totalHours > 0 ? "Partially Attended" : "Absent")
      });

      monthsMap[monthName].totalHours += log.totalHours;
      if (log.totalHours >= 8) {
        monthsMap[monthName].daysPresent += 1;
      }
    });

    // Format total hours cleanly
    const result = Object.values(monthsMap).map(m => {
      m.totalHours = `${parseFloat(m.totalHours.toFixed(2))}h`;
      return m;
    });

    return res.status(200).json({
      success: true,
      attendanceData: result
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
