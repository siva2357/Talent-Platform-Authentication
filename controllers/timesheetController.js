const Attendance = require("../models/attendance");
const Contract = require("../models/contract");
const Application = require("../models/application");

// Helper: Calculate week boundaries and names
function getWeekBoundaries(dateStr) {
  const parts = dateStr.split("-");
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(dateObj.setDate(diff));
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const pad = (num) => String(num).padStart(2, "0");
  const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
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

// ==========================================
// CLIENT: Get Contract Timesheets dynamically from Attendance logs
// GET /api/timesheets/client
// ==========================================
exports.getClientTimesheets = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can view contract timesheets" });
    }

    const clientId = req.userId;

    // Find all contracts belonging to this client
    const contracts = await Contract.find({ clientId });

    const formattedContracts = await Promise.all(
      contracts.map(async (contract) => {
        // Find accepted freelancer for this contract
        const application = await Application.findOne({
          contractId: contract._id,
          offerStatus: "accepted"
        }).populate("freelancerId", "registrationDetails.fullName");

        const freelancerName = application?.freelancerId?.registrationDetails?.fullName || "Assigned Freelancer";

        // Find all attendance logs for this contract with hours > 0
        const logs = await Attendance.find({ contractId: contract._id, totalHours: { $gt: 0 } }).sort({ date: 1 });

        // Group by week
        const weeksMap = {};
        for (const log of logs) {
          const weekRange = getWeekBoundaries(log.date);
          const key = weekRange.weekStartDate;
          if (!weeksMap[key]) {
            weeksMap[key] = {
              weekStartDate: weekRange.weekStartDate,
              weekEndDate: weekRange.weekEndDate,
              week: weekRange.week,
              month: weekRange.month,
              days: {},
              total: 0
            };
          }

          const dateParts = log.date.split("-");
          const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
          const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
          const dayField = dayNames[dateObj.getDay()];

          const pad = (num) => String(num).padStart(2, "0");
          const formattedDate = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;

          weeksMap[key].days[dayField] = {
            date: formattedDate,
            hours: log.totalHours,
            attendance: log.totalHours >= 8 ? "Present" : "Partial",
            approvalStatus: log.approvalStatus || "Pending Approval"
          };

          weeksMap[key].total += log.totalHours;
        }

        // Fill in missing days
        const formattedTimesheets = Object.values(weeksMap).map(week => {
          const dayNames = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
          const mondayDate = new Date(week.weekStartDate);

          dayNames.forEach((dayName, idx) => {
            if (!week.days[dayName]) {
              const d = new Date(mondayDate);
              d.setDate(mondayDate.getDate() + idx);
              const pad = (num) => String(num).padStart(2, "0");
              const formattedDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
              week.days[dayName] = {
                date: formattedDate,
                hours: 0,
                attendance: "N/A",
                approvalStatus: "N/A"
              };
            }
          });

          // Determine status based on daily approvalStatus
          const dailyStatuses = Object.values(week.days)
            .filter(d => d.attendance !== "N/A")
            .map(d => d.approvalStatus);

          let weeklyStatus = "Pending Approval";
          if (dailyStatuses.length > 0 && dailyStatuses.every(s => s === "Approved")) {
            weeklyStatus = "Approved";
          } else if (dailyStatuses.some(s => s === "Rejected")) {
            weeklyStatus = "Rejected";
          }

          return {
            id: `${contract._id}_${week.weekStartDate}`, // Unique composite identifier
            _id: `${contract._id}_${week.weekStartDate}`,
            week: week.week,
            month: week.month,
            total: parseFloat(week.total.toFixed(2)),
            status: weeklyStatus,
            mon: week.days.mon,
            tue: week.days.tue,
            wed: week.days.wed,
            thu: week.days.thu,
            fri: week.days.fri,
            sat: week.days.sat,
            sun: week.days.sun
          };
        }).reverse(); // Sort so newest is first

        const formatDateStr = (d) => {
          if (!d) return "TBD";
          return new Date(d).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
        };

        const spent = contract.spent || 0;
        const budget = contract.estimatedBudget || 0;

        return {
          id: contract._id,
          _id: contract._id,
          title: contract.contractTitle,
          freelancer: freelancerName,
          budget: budget,
          spent: spent,
          remaining: Math.max(0, budget - spent),
          startDate: formatDateStr(contract.contractStartDate),
          endDate: formatDateStr(contract.contractEndDate),
          status: contract.status === "in progress" ? "Active" : (contract.status === "completed" ? "Completed" : "Pending"),
          timesheets: formattedTimesheets
        };
      })
    );

    return res.status(200).json({
      success: true,
      contracts: formattedContracts
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CLIENT: Approve Timesheet (Approve all attendance logs of that week)
// PUT /api/timesheets/:id/approve
// ==========================================
exports.approveTimesheet = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can approve timesheets" });
    }

    const compositeId = req.params.id;
    const [contractId, weekStartDate] = compositeId.split("_");

    if (!contractId || !weekStartDate) {
      return res.status(400).json({ success: false, message: "Invalid timesheet ID format" });
    }

    // Find contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    // Get all dates for this week
    const parts = weekStartDate.split("-");
    const monday = new Date(parts[0], parts[1] - 1, parts[2]);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const pad = (num) => String(num).padStart(2, "0");
      dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }

    // Find all attendance logs for this week with hours > 0
    const attendances = await Attendance.find({
      contractId,
      date: { $in: dates },
      totalHours: { $gt: 0 }
    });

    if (attendances.length === 0) {
      return res.status(404).json({ success: false, message: "No attendance logs found for this week" });
    }

    // Update daily attendance to Approved and calculate total weekly hours
    let totalWeeklyHours = 0;
    for (const att of attendances) {
      if (att.approvalStatus === "Approved") {
        continue; // Already approved, don't double count cost
      }
      att.approvalStatus = "Approved";
      await att.save();
      totalWeeklyHours += att.totalHours;
    }

    // Update contract spent: let's assume a default rate of $50/hour
    const hourlyRate = 50;
    const weeklyCost = totalWeeklyHours * hourlyRate;

    contract.spent = (contract.spent || 0) + weeklyCost;
    await contract.save();

    return res.status(200).json({
      success: true,
      message: "Weekly timesheet approved successfully",
      contractSpent: contract.spent
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
