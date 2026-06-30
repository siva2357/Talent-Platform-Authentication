const User = require("../models/user");
const Contract = require("../models/contract");
const Application = require("../models/application");
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

      // 3. Completed Contracts Count
      const completedContractsCount = await Contract.countDocuments({
        freelancerId: userId,
        status: "completed"
      });

      // 4. Submitted Proposals Count
      const submittedProposalsCount = await Application.countDocuments({
        freelancerId: userId
      });

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

      const totalEarnings = diaryEarnings;

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
            status: "pending"
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
            value: `₹${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            trend: "+12%",
            trendType: "up"
          },
          {
            label: "Active Contracts",
            value: activeContractsCount.toString(),
            trend: "Active",
            trendType: "neutral",
            statusText: "Active"
          },
          {
            label: "Completed Contracts",
            value: completedContractsCount.toString(),
            trend: "Done",
            trendType: "up",
            statusText: "Completed"
          },
          {
            label: "Submitted Proposals",
            value: submittedProposalsCount.toString(),
            trend: "Pending",
            trendType: "neutral",
            statusText: "Pending"
          }
        ],
        activities: sortedActivities.length > 0 ? sortedActivities : [
          {
            title: "Welcome to Talent Hub",
            description: "Browse contracts to start logging work and earning.",
            time: "Just now",
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

      // 4. Total Spent & Escrow Balance calculated dynamically from ContractDiary phases
      const clientContracts = await Contract.find({ clientId: userId });
      const clientDiaries = await ContractDiary.find({ clientId: userId });

      const diarySpentMap = new Map();
      for (const diary of clientDiaries) {
        const spentVal = diary.phases
          .filter(p => p.status === "approved")
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        diarySpentMap.set(diary.contractId.toString(), spentVal);
      }

      const totalBudget = clientContracts.reduce((acc, c) => acc + (c.estimatedBudget || 0), 0);
      const totalSpent = clientContracts.reduce((acc, c) => {
        const contractSpent = diarySpentMap.has(c._id.toString())
          ? diarySpentMap.get(c._id.toString())
          : 0;
        return acc + contractSpent;
      }, 0);
      const Transaction = require("../models/transaction");
      const escrowFundedTxns = await Transaction.find({
        userId,
        type: "Escrow Funded",
        status: "Paid"
      });
      const totalEscrowFunded = escrowFundedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
      const escrowBalance = Math.max(0, totalEscrowFunded - totalSpent);

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
            type: "proposal"
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
            type: act.type
          };
        });

      return res.status(200).json({
        success: true,
        role,
        fullName: clientName,
        profilePhoto,
        stats: [
          { label: "Active Contracts", value: activeContractsCount.toString() },
          { label: "Total Spent", value: `₹${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: "Escrow Balance", value: `₹${escrowBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: "Pending Proposals", value: pendingProposalsCount.toString() }
        ],
        activities: sortedActivities.length > 0 ? sortedActivities : [
          {
            id: 1,
            user: "Talent Hub",
            action: "system set up correctly",
            project: "Acme Corp",
            time: "Just now",
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
