const User = require("../models/user");
const Contract = require("../models/contract");
const Application = require("../models/application");
const Attendance = require("../models/attendance");
const Timesheet = require("../models/timesheet");
const ContractDiary = require("../models/contractDiary");
const ClientProfile = require("../models/clientProfile");
const FreelancerProfile = require("../models/freelancerProfile");

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.role; // "Client" or "Freelancer"

    // Fetch user details for basic fallback info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (role === "Freelancer") {
      // 1. Fetch Freelancer Profile details
      const profile = await FreelancerProfile.findOne({ userId });
      const freelancerName = profile?.basicInformation?.fullName || user.registrationDetails.fullName;
      const profilePhoto = profile?.basicInformation?.profilePhoto || "";

      // 2. Active Contracts Count
      const activeContractsCount = await Application.countDocuments({
        freelancerId: userId,
        offerStatus: "accepted"
      });

      // 3. Submitted Proposals Count
      const submittedProposalsCount = await Application.countDocuments({
        freelancerId: userId
      });

      // 4. Attendance Hours Sum
      const attendanceLogs = await Attendance.find({ freelancerId: userId });
      const totalAttendanceHours = attendanceLogs.reduce((acc, log) => acc + (log.totalHours || 0), 0);

      // 5. Total Earnings
      // Approved timesheet earnings (hours * $50 default rate)
      const approvedTimesheets = await Timesheet.find({ freelancerId: userId, status: "Approved" });
      const timesheetEarnings = approvedTimesheets.reduce((acc, ts) => acc + (ts.total * 50), 0);

      // Approved contract diary milestones earnings
      const diaries = await ContractDiary.find({ freelancerId: userId });
      let diaryEarnings = 0;
      diaries.forEach(d => {
        d.phases.forEach(p => {
          if (p.status === "approved") {
            diaryEarnings += (p.amount || 0);
          }
        });
      });

      const totalEarnings = timesheetEarnings + diaryEarnings;

      // 6. Dynamic Recent Activities for Freelancer
      const rawActivities = [];

      // Add recent applications
      const apps = await Application.find({ freelancerId: userId })
        .populate("contractId", "contractTitle")
        .sort({ createdAt: -1 })
        .limit(3);
      apps.forEach(app => {
        if (app.contractId) {
          rawActivities.push({
            title: "Application Submitted",
            description: `Applied to contract: ${app.contractId.contractTitle}`,
            time: app.createdAt,
            icon: "bi-file-earmark-text-fill",
            status: "pending"
          });
        }
      });

      // Add recent attendance check-outs
      const attendances = await Attendance.find({ freelancerId: userId, totalHours: { $gt: 0 } })
        .populate("contractId", "contractTitle")
        .sort({ updatedAt: -1 })
        .limit(3);
      attendances.forEach(att => {
        if (att.contractId) {
          rawActivities.push({
            title: "Attendance Marked",
            description: `Logged ${att.totalHours}h for ${att.contractId.contractTitle}`,
            time: att.updatedAt,
            icon: "bi-clock-fill",
            status: "completed"
          });
        }
      });

      // Add recent accepted offers
      const acceptedOffers = await Application.find({ freelancerId: userId, offerStatus: "accepted" })
        .populate("contractId", "contractTitle")
        .sort({ updatedAt: -1 })
        .limit(3);
      acceptedOffers.forEach(offer => {
        if (offer.contractId) {
          rawActivities.push({
            title: "Contract Started",
            description: `You started the contract: ${offer.contractId.contractTitle}`,
            time: offer.updatedAt,
            icon: "bi-briefcase-fill",
            status: "completed"
          });
        }
      });

      // Sort activities by timestamp (newest first)
      const sortedActivities = rawActivities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 4)
        .map(act => {
          // Format time relative or simple string
          const date = new Date(act.time);
          const diffMs = Date.now() - date.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          let timeStr = date.toLocaleDateString();
          if (diffHours < 1) {
            timeStr = "Just now";
          } else if (diffHours < 24) {
            timeStr = `${diffHours} hours ago`;
          } else if (diffHours < 48) {
            timeStr = "Yesterday";
          }
          return {
            ...act,
            time: timeStr
          };
        });

      return res.status(200).json({
        success: true,
        role,
        fullName: freelancerName,
        profilePhoto,
        activeContractsCount,
        stats: [
          {
            label: "Total Earnings",
            value: `$${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            trend: "+12%",
            trendType: "up",
            icon: "bi-currency-dollar",
            color: "blue"
          },
          {
            label: "Active Contracts",
            value: activeContractsCount.toString(),
            trend: "Active",
            trendType: "neutral",
            icon: "bi-check2-circle",
            color: "green",
            statusText: "Active"
          },
          {
            label: "Submitted Proposals",
            value: submittedProposalsCount.toString(),
            trend: "Pending",
            trendType: "neutral",
            icon: "bi-cash-stack",
            color: "purple",
            statusText: "Pending"
          },
          {
            label: "Attendance Hours",
            value: totalAttendanceHours.toFixed(1),
            trend: "AVAILABLE",
            trendType: "up",
            icon: "bi-clock-history",
            color: "gold"
          }
        ],
        activities: sortedActivities.length > 0 ? sortedActivities : [
          {
            title: "Welcome to Talent Hub",
            description: "Browse contracts to start logging work and earning.",
            time: "Just now",
            icon: "bi-info-circle-fill",
            status: "completed"
          }
        ]
      });

    } else if (role === "Client") {
      // 1. Fetch Client Profile details
      const profile = await ClientProfile.findOne({ userId });
      const clientName = profile?.basicInformation?.fullName || user.registrationDetails.fullName;
      const profilePhoto = profile?.basicInformation?.profilePhoto || "";

      // 2. Active Contracts Count
      const activeContractsCount = await Contract.countDocuments({
        clientId: userId,
        status: "in progress"
      });

      // 3. Pending Proposals Count
      const pendingProposalsCount = await Application.countDocuments({
        clientId: userId,
        applicationStatus: "application received"
      });

      // 4. Total Spent
      const clientContracts = await Contract.find({ clientId: userId });
      const totalSpent = clientContracts.reduce((acc, c) => acc + (c.spent || 0), 0);

      // 5. Recent Activities for Client
      const rawActivities = [];

      // Add recent freelancer proposals received
      const apps = await Application.find({ clientId: userId })
        .populate("freelancerId", "registrationDetails.fullName")
        .populate("contractId", "contractTitle")
        .sort({ createdAt: -1 })
        .limit(3);
      apps.forEach(app => {
        if (app.freelancerId && app.contractId) {
          rawActivities.push({
            user: app.freelancerId.registrationDetails.fullName,
            action: "submitted a proposal",
            project: app.contractId.contractTitle,
            time: app.createdAt,
            icon: "bi-file-earmark-text",
            type: "proposal"
          });
        }
      });

      // Add recent freelancer clock logs
      const contractIds = clientContracts.map(c => c._id);
      const attendances = await Attendance.find({ contractId: { $in: contractIds }, totalHours: { $gt: 0 } })
        .populate("freelancerId", "registrationDetails.fullName")
        .populate("contractId", "contractTitle")
        .sort({ updatedAt: -1 })
        .limit(3);
      attendances.forEach(att => {
        if (att.freelancerId && att.contractId) {
          rawActivities.push({
            user: att.freelancerId.registrationDetails.fullName,
            action: `logged ${att.totalHours} hours`,
            project: att.contractId.contractTitle,
            time: att.updatedAt,
            icon: "bi-clock-history",
            type: "time"
          });
        }
      });

      // Add recent milestone / phase reviews
      const diaries = await ContractDiary.find({ clientId: userId });
      diaries.forEach(d => {
        d.phases.forEach(p => {
          if (p.status === "approved") {
            rawActivities.push({
              user: "You",
              action: `approved milestone: "${p.name}"`,
              project: d.contractId?.contractTitle || "Contract",
              time: p.approvedAt || p.updatedAt,
              icon: "bi-check-circle",
              type: "milestone"
            });
          }
        });
      });

      // Sort activities (newest first)
      const sortedActivities = rawActivities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 4)
        .map((act, idx) => {
          const date = new Date(act.time);
          const diffMs = Date.now() - date.getTime();
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          let timeStr = date.toLocaleDateString();
          if (diffHours < 1) {
            timeStr = "Just now";
          } else if (diffHours < 24) {
            timeStr = `${diffHours} hours ago`;
          } else if (diffHours < 48) {
            timeStr = "Yesterday";
          }
          return {
            id: idx + 1,
            user: act.user,
            action: act.action,
            project: act.project,
            time: timeStr,
            icon: act.icon,
            type: act.type
          };
        });

      return res.status(200).json({
        success: true,
        role,
        fullName: clientName,
        profilePhoto,
        stats: [
          { label: "Active Contracts", value: activeContractsCount.toString(), icon: "bi-briefcase", color: "primary" },
          { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, icon: "bi-currency-dollar", color: "success" },
          { label: "Pending Proposals", value: pendingProposalsCount.toString(), icon: "bi-file-earmark-text", color: "warning" }
        ],
        activities: sortedActivities.length > 0 ? sortedActivities : [
          {
            id: 1,
            user: "Talent Hub",
            action: "system set up correctly",
            project: "Acme Corp",
            time: "Just now",
            icon: "bi-info-circle",
            type: "milestone"
          }
        ]
      });
    }

    return res.status(400).json({ success: false, message: "Invalid user role" });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
