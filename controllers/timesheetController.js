const Timesheet = require("../models/timesheet");
const Contract = require("../models/contract");
const Application = require("../models/application");

// ==========================================
// CLIENT: Get Contract Timesheets
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

        // Find timesheets for this contract
        const timesheets = await Timesheet.find({ contractId: contract._id })
          .populate("freelancerId", "registrationDetails.fullName")
          .sort({ weekStartDate: -1 });

        const formattedTimesheets = timesheets.map(t => {
          const mapDay = (dayObj) => ({
            date: dayObj.date,
            hours: dayObj.hours,
            attendance: dayObj.attendance,
            faceMatch: dayObj.faceMatch
          });

          return {
            id: t._id,
            week: t.week,
            month: t.month,
            total: t.total,
            status: t.status,
            mon: mapDay(t.mon),
            tue: mapDay(t.tue),
            wed: mapDay(t.wed),
            thu: mapDay(t.thu),
            fri: mapDay(t.fri),
            sat: mapDay(t.sat),
            sun: mapDay(t.sun)
          };
        });

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
// CLIENT: Approve Timesheet
// PUT /api/timesheets/:id/approve
// ==========================================
exports.approveTimesheet = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can approve timesheets" });
    }

    const timesheetId = req.params.id;
    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      return res.status(404).json({ success: false, message: "Timesheet not found" });
    }

    if (timesheet.status === "Approved") {
      return res.status(400).json({ success: false, message: "Timesheet is already approved" });
    }

    // Find contract to update budget spent
    const contract = await Contract.findById(timesheet.contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found" });
    }

    // Mark as approved
    timesheet.status = "Approved";
    await timesheet.save();

    // Calculate weekly cost. Let's assume a default rate of $50/hour if budgetType is Hourly,
    // or calculate based on total estimated budget vs expected duration.
    const hourlyRate = 50; 
    const weeklyCost = timesheet.total * hourlyRate;

    // Update contract spent
    contract.spent = (contract.spent || 0) + weeklyCost;
    await contract.save();

    return res.status(200).json({
      success: true,
      message: "Timesheet approved successfully",
      timesheet,
      contractSpent: contract.spent
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
