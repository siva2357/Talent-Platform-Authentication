
const Contract = require("../models/contract");
const ClientProfile = require("../models/clientProfile");
const FreelancerProfile = require("../models/freelancerProfile");
const Application = require("../models/application");
const User = require("../models/user");
const Notification = require("../models/notification");
const sendMail = require("../middleware/sendMail");
const { createContractSchema } = require("../schemas/contractSchemas");


exports.createContract = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can access this feature" });
    }
    const clientId = req.userId;
    const { error, value: validatedData } = createContractSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { contractTitle, estimatedBudget, contractStartDate, contractEndDate, contractDescription, contractType, contractSubject, status } = validatedData;
    
    if (estimatedBudget < 30000 || estimatedBudget > 75000) {
      return res.status(400).json({
        success: false,
        message: "Estimated budget must be between ₹30,000 and ₹75,000"
      });
    }

    const startDateObj = new Date(contractStartDate);
    const endDateObj = new Date(contractEndDate);
    if (endDateObj < startDateObj) {
      return res.status(400).json({
        success: false,
        message: "End date must be greater than start date"
      });
    }

    const minEndDate = new Date(startDateObj);
    minEndDate.setMonth(minEndDate.getMonth() + 3);
    const maxEndDate = new Date(startDateObj);
    maxEndDate.setMonth(maxEndDate.getMonth() + 6);

    if (endDateObj < minEndDate) {
      return res.status(400).json({
        success: false,
        message: "Contract duration must be at least 3 months"
      });
    }

    if (endDateObj > maxEndDate) {
      return res.status(400).json({
        success: false,
        message: "Contract duration cannot exceed 6 months"
      });
    }

    const contract = await Contract.create({
      clientId,
      contractTitle,
      estimatedBudget,
      contractStartDate,
      contractEndDate,
      contractDescription,
      contractType,
      contractSubject,
      status
    });

    return res.status(201).json({
      success: true,
      message: "Contract created successfully",
      contract
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyContracts = async (req, res) => {

  try {

    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can access this feature" });
    }

    const clientId = req.userId;

    const contracts = await Contract.find({ clientId })
      .select("contractTitle estimatedBudget contractStartDate contractEndDate contractType contractSubject status createdAt")
      .sort({ createdAt: -1 });

    const ContractDiary = require("../models/contractDiary");
    const Transaction = require("../models/transaction");

    const diaries = await ContractDiary.find({ clientId });
    const diarySpentMap = new Map();
    for (const diary of diaries) {
      const spentVal = diary.phases
        .filter(p => p.status === "approved")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      diarySpentMap.set(diary.contractId.toString(), spentVal);
    }

    const fundedTxns = await Transaction.find({
      userId: clientId,
      type: "Escrow Funded",
      status: "Paid"
    });
    const contractFundedMap = new Map();
    for (const txn of fundedTxns) {
      if (txn.contractId) {
        const cId = txn.contractId.toString();
        contractFundedMap.set(cId, (contractFundedMap.get(cId) || 0) + (txn.amount || 0));
      }
    }

    const formattedContracts = contracts.map(contract => {
      const contractObj = contract.toObject();
      const dynamicSpent = diarySpentMap.has(contractObj._id.toString())
        ? diarySpentMap.get(contractObj._id.toString())
        : 0;
      const dynamicFunded = contractFundedMap.has(contractObj._id.toString())
        ? contractFundedMap.get(contractObj._id.toString())
        : 0;
      contractObj.spent = dynamicSpent;
      contractObj.funded = dynamicFunded;
      return contractObj;
    });

    return res.status(200).json({

      success: true,

      totalContracts: formattedContracts.length,

      contracts: formattedContracts

    });

  }

  catch (error) {

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.getMyContractById = async (req, res) => {
  try {

    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can access this feature" });
    }

    const clientId = req.userId;

    const contract = await Contract.findOne({
      _id: req.params.id,
      clientId
    })
    .populate({
      path: 'applicants.applicationId',
      select: 'applicationStatus'
    })
    .populate({
      path: 'applicants.freelancerId',
      select: 'registrationDetails'
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });
    }

    const ContractDiary = require("../models/contractDiary");
    const diary = await ContractDiary.findOne({ contractId: contract._id });
    const contractObj = contract.toObject();
    if (diary) {
      contractObj.spent = diary.phases
        .filter(p => p.status === "approved")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    } else {
      contractObj.spent = 0;
    }

    return res.status(200).json({
      success: true,
      contract: contractObj
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateContract = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can access this feature" });
    }
    const clientId = req.userId;
    const {
      contractTitle,

      estimatedBudget,
      contractStartDate,
      contractEndDate,
      contractDescription,
      contractType,
      contractSubject,
      status
    } = req.body;

    if (estimatedBudget !== undefined && (estimatedBudget < 30000 || estimatedBudget > 75000)) {
      return res.status(400).json({
        success: false,
        message: "Estimated budget must be between ₹30,000 and ₹75,000"
      });
    }

    const allowedStatus = ["pending", "in progress", "completed"];

    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }

    const contract = await Contract.findOne({
      _id: req.params.id,
      clientId
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });
    }

    const newStartDate = contractStartDate !== undefined ? new Date(contractStartDate) : new Date(contract.contractStartDate);
    const newEndDate = contractEndDate !== undefined ? new Date(contractEndDate) : new Date(contract.contractEndDate);
    
    if (newEndDate < newStartDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be greater than start date"
      });
    }
    
    const minAllowedEndDate = new Date(newStartDate);
    minAllowedEndDate.setMonth(minAllowedEndDate.getMonth() + 3);
    const maxAllowedEndDate = new Date(newStartDate);
    maxAllowedEndDate.setMonth(maxAllowedEndDate.getMonth() + 6);
    
    if (newEndDate < minAllowedEndDate) {
      return res.status(400).json({
        success: false,
        message: "Contract duration must be at least 3 months"
      });
    }

    if (newEndDate > maxAllowedEndDate) {
      return res.status(400).json({
        success: false,
        message: "Contract duration cannot exceed 6 months"
      });
    }

    if (contractTitle !== undefined) {
      contract.contractTitle = contractTitle;
    }



    if (estimatedBudget !== undefined) {
      contract.estimatedBudget = estimatedBudget;
    }

    if (contractStartDate !== undefined) {
      contract.contractStartDate = contractStartDate;
    }

    if (contractEndDate !== undefined) {
      contract.contractEndDate = contractEndDate;
    }

    if (contractDescription !== undefined) {
      contract.contractDescription = contractDescription;
    }

    if (contractType !== undefined) {
      contract.contractType = contractType;
    }

    if (contractSubject !== undefined) {
      contract.contractSubject = contractSubject;
    }



    if (status !== undefined) {
      contract.status = status;
      
      // Pass the same status to the ContractDiary if it exists
      const ContractDiary = require("../models/contractDiary");
      const diary = await ContractDiary.findOne({ contractId: contract._id });
      if (diary) {
        if (status === 'completed') {
          diary.overallStatus = 'completed';
        } else if (status === 'in progress') {
          diary.overallStatus = 'in-progress';
        } else if (status === 'pending') {
          diary.overallStatus = 'not-started';
        }
        await diary.save();
      }
    }

    await contract.save();

    return res.status(200).json({
      success: true,
      message: "Contract updated successfully",
      contract
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteContract = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can access this feature" });
    }
    const clientId = req.userId;

    const contract = await Contract.findOneAndDelete({
      _id: req.params.id,
      clientId
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contract deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAllContracts = async (req, res) => {

  try {

    // Only Freelancer can access
    if (req.role !== "Freelancer") {

      return res.status(403).json({
        success: false,
        message: "Only freelancers can access contracts"
      });

    }

    const freelancerId = req.userId;

    const contracts = await Contract.find()
      .populate(
        "clientId",
        "registrationDetails.fullName registrationDetails.email role"
      )
      .sort({
        createdAt: -1
      });

    const formattedContracts = await Promise.all(

      contracts.map(async (contract) => {

        // ====================================
        // Get Client Profile
        // ====================================

        const clientProfile = await ClientProfile.findOne({
          userId: contract.clientId._id
        });

        let totalDuration = "";

        if (
          contract.contractStartDate &&
          contract.contractEndDate
        ) {

          const startDate = new Date(
            contract.contractStartDate
          );

          const endDate = new Date(
            contract.contractEndDate
          );

          const diffTime = Math.abs(
            endDate - startDate
          );

          const totalDays = Math.floor(
            diffTime / (1000 * 60 * 60 * 24)
          );

          const months = Math.floor(totalDays / 30);

          const remainingDaysAfterMonths =
            totalDays % 30;

          const weeks = Math.floor(
            remainingDaysAfterMonths / 7
          );

          const days =
            remainingDaysAfterMonths % 7;

          if (months > 0) {

            totalDuration += `${months} month`;

            if (months > 1) {
              totalDuration += "s";
            }

          }

          if (weeks > 0) {

            if (totalDuration.length > 0) {
              totalDuration += ", ";
            }

            totalDuration += `${weeks} week`;

            if (weeks > 1) {
              totalDuration += "s";
            }

          }

          if (days > 0) {

            if (totalDuration.length > 0) {
              totalDuration += ", ";
            }

            totalDuration += `${days} day`;

            if (days > 1) {
              totalDuration += "s";
            }

          }

        }

        const hasApplied = contract.applicants?.some(
          (applicant) =>
            applicant.freelancerId.toString() ===
            freelancerId.toString()
        );

        const hasSaved = contract.savedBy?.some(
          (savedUserId) =>
            savedUserId.toString() ===
            freelancerId.toString()
        );

        const clientType = clientProfile?.professionalDetails?.clientType || "";
        const isIndividual = clientType === "Individual";
        return {
          _id: contract._id,
          clientName: contract.clientId?.registrationDetails?.fullName || "",
          clientType,
          website: isIndividual ? "" : (clientProfile?.professionalDetails?.website || ""),
          industry: isIndividual ? "" : (clientProfile?.professionalDetails?.industry || ""),
          contractTitle: contract.contractTitle,
          estimatedBudget: contract.estimatedBudget,
          contractDescription: contract.contractDescription,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          contractType: contract.contractType || "",
          contractSubject: contract.contractSubject || "",
          totalDuration,
          status: contract.status,
          hasApplied,
          hasSaved,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt
        };
      })
    );

    return res.status(200).json({

      success: true,

      totalContracts: formattedContracts.length,

      contracts: formattedContracts

    });

  }

  catch (error) {

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.getSingleContract = async (req, res) => {

  try {

    // Only Freelancer can access
    if (req.role !== "Freelancer") {

      return res.status(403).json({
        success: false,
        message: "Only freelancers can access contracts"
      });

    }

    const freelancerId = req.userId;

    const contract = await Contract.findById(req.params.id)
      .populate(
        "clientId",
        "registrationDetails.fullName registrationDetails.email role"
      );

    if (!contract) {

      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });

    }

    // ========================================
    // Get Client Profile
    // ========================================


    const clientProfile = await ClientProfile.findOne({
      userId: contract.clientId._id
    });


    // ========================================
    // Has Applied
    // ========================================

    const hasApplied = contract.applicants?.some(
      (applicant) =>
        applicant.freelancerId.toString() ===
        freelancerId.toString()
    );

    // ========================================
    // Has Saved
    // ========================================

    const hasSaved = contract.savedBy?.some(
      (savedUserId) =>
        savedUserId.toString() ===
        freelancerId.toString()
    );

    // ========================================
    // Calculate Total Duration
    // ========================================

    let totalDuration = "";

    if (
      contract.contractStartDate &&
      contract.contractEndDate
    ) {

      const startDate = new Date(
        contract.contractStartDate
      );

      const endDate = new Date(
        contract.contractEndDate
      );

      const diffTime = Math.abs(
        endDate - startDate
      );

      const totalDays = Math.floor(
        diffTime / (1000 * 60 * 60 * 24)
      );

      const months = Math.floor(totalDays / 30);

      const remainingDaysAfterMonths =
        totalDays % 30;

      const weeks = Math.floor(
        remainingDaysAfterMonths / 7
      );

      const days =
        remainingDaysAfterMonths % 7;

      if (months > 0) {

        totalDuration += `${months} month`;

        if (months > 1) {
          totalDuration += "s";
        }

      }

      if (weeks > 0) {

        if (totalDuration.length > 0) {
          totalDuration += ", ";
        }

        totalDuration += `${weeks} week`;

        if (weeks > 1) {
          totalDuration += "s";
        }

      }

      if (days > 0) {

        if (totalDuration.length > 0) {
          totalDuration += ", ";
        }

        totalDuration += `${days} day`;

        if (days > 1) {
          totalDuration += "s";
        }

      }

    }

    // ========================================
    // Response
    // ========================================

    return res.status(200).json({

      success: true,

      contract: {

        _id: contract._id,

        clientId: contract.clientId,

        clientName:
          contract.clientId?.registrationDetails?.fullName || "",

        clientEmail:
          contract.clientId?.registrationDetails?.email || "",

        clientRole:
          contract.clientId?.role || "",

        clientType:
          clientProfile?.professionalDetails?.clientType || "",

        website:
          (clientProfile?.professionalDetails?.clientType === "Individual") ? "" : (clientProfile?.professionalDetails?.website || ""),

        industry:
          (clientProfile?.professionalDetails?.clientType === "Individual") ? "" : (clientProfile?.professionalDetails?.industry || ""),

        contractTitle:
          contract.contractTitle,

        estimatedBudget:
          contract.estimatedBudget,

        contractDescription:
          contract.contractDescription,

        contractStartDate:
          contract.contractStartDate,

        contractEndDate:
          contract.contractEndDate,

        contractType:
          contract.contractType || "",

        contractSubject:
          contract.contractSubject || "",

        totalDuration,

        status:
          contract.status,

        hasApplied,

        hasSaved,

        createdAt:
          contract.createdAt,

        updatedAt:
          contract.updatedAt

      }

    });

  }

  catch (error) {

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.saveContract = async (req, res) => {

  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access contracts" });
    }

    const freelancerId = req.userId;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {

      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });

    }

    const alreadySaved = contract.savedBy.includes(freelancerId);

    if (alreadySaved) {

      return res.status(400).json({
        success: false,
        message: "Contract already saved"
      });

    }

    contract.savedBy.push(freelancerId);

    await contract.save();

    return res.status(200).json({
      success: true,
      message: "Contract saved successfully"
    });

  }

  catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

exports.unsaveContract = async (req, res) => {

  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access contracts" });
    }

    const freelancerId = req.userId;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {

      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });

    }

    await Contract.updateOne(
      { _id: contract._id },
      { $pull: { savedBy: freelancerId } }
    );

    return res.status(200).json({
      success: true,
      message: "Contract unsaved successfully"
    });

  }

  catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

exports.getSavedContracts = async (req, res) => {

  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access contracts" });
    }

    const freelancerId = req.userId;

    const contracts = await Contract.find({
      savedBy: freelancerId
    })
      .populate(
        "clientId",
        "registrationDetails.fullName registrationDetails.email"
      )
      .sort({
        createdAt: -1
      });

    const formattedContracts = await Promise.all(
      contracts.map(async (contract) => {
        const clientProfile = await ClientProfile.findOne({
          userId: contract.clientId._id
        });

        let totalDuration = "";
        if (contract.contractStartDate && contract.contractEndDate) {
          const startDate = new Date(contract.contractStartDate);
          const endDate = new Date(contract.contractEndDate);
          const diffTime = Math.abs(endDate - startDate);
          const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const months = Math.floor(totalDays / 30);
          const remainingDaysAfterMonths = totalDays % 30;
          const weeks = Math.floor(remainingDaysAfterMonths / 7);
          const days = remainingDaysAfterMonths % 7;

          if (months > 0) {
            totalDuration += `${months} month`;
            if (months > 1) totalDuration += "s";
          }
          if (weeks > 0) {
            if (totalDuration.length > 0) totalDuration += ", ";
            totalDuration += `${weeks} week`;
            if (weeks > 1) totalDuration += "s";
          }
          if (days > 0) {
            if (totalDuration.length > 0) totalDuration += ", ";
            totalDuration += `${days} day`;
            if (days > 1) totalDuration += "s";
          }
        }

        const hasApplied = contract.applicants?.some(
          (applicant) => applicant.freelancerId.toString() === freelancerId.toString()
        );

        const hasSaved = true; // since it's from getSavedContracts

        const clientType = clientProfile?.professionalDetails?.clientType || "";
        const isIndividual = clientType === "Individual";

        return {
          _id: contract._id,
          clientName: contract.clientId?.registrationDetails?.fullName || "",
          clientType,
          website: isIndividual ? "" : (clientProfile?.professionalDetails?.website || ""),
          industry: isIndividual ? "" : (clientProfile?.professionalDetails?.industry || ""),
          contractTitle: contract.contractTitle,
          budgetType: contract.budgetType,
          estimatedBudget: contract.estimatedBudget,
          contractDescription: contract.contractDescription,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
          contractType: contract.contractType || "",
          contractSubject: contract.contractSubject || "",
          totalDuration,
          status: contract.status,
          totalApplicants: contract.applicants?.length || 0,
          hasApplied,
          hasSaved,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt
        };
      })
    );

    return res.status(200).json({
      success: true,
      totalContracts: formattedContracts.length,
      contracts: formattedContracts
    });

  }

  catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

exports.applyToContract = async (req, res) => {

  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access contracts" });
    }

    const freelancerId = req.userId;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {

      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });

    }

    const alreadyApplied = contract.applicants.some(
      (applicant) =>
        applicant.freelancerId.toString() ===
        freelancerId.toString()
    );

    if (alreadyApplied) {

      return res.status(400).json({
        success: false,
        message: "Already applied"
      });

    }

    // ========================================
    // Create Application
    // ========================================

    const application = await Application.create({
      contractId: contract._id,
      clientId: contract.clientId,
      freelancerId
    });

    // ========================================
    // Push Reference To Contract
    // ========================================

    contract.applicants.push({
      applicationId: application._id,
      freelancerId
    });

    await contract.save();

    // Notify client
    try {
      const freelancerUser = await User.findById(freelancerId);
      const clientUser = await User.findById(contract.clientId);
      if (clientUser) {
        await Notification.create({
          userId: contract.clientId,
          role: "client",
          title: "New Contract Application",
          message: `${freelancerUser?.registrationDetails?.fullName || "A freelancer"} has applied for your contract "${contract.contractTitle}".`,
          link: "/user/hired-talent?tab=offers"
        });

        if (clientUser.registrationDetails?.email) {
          await sendMail.sendMail({
            from: `"Talent Hub" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
            to: clientUser.registrationDetails.email,
            subject: "Talent Hub - New Contract Application Received",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4A90E2; text-align: center;">New Application Received</h2>
                <p>Hello ${clientUser.registrationDetails.fullName},</p>
                <p><strong>${freelancerUser?.registrationDetails?.fullName || "A freelancer"}</strong> has applied for your contract project: <strong>${contract.contractTitle}</strong>.</p>
                <p>Log in to your dashboard to review their proposal and portfolio.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="text-align: center; color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} Talent Hub. All rights reserved.</p>
              </div>
            `
          });
        }
      }
    } catch (err) {
      console.error("Failed to notify client on application:", err);
    }

    return res.status(200).json({
      success: true,
      message: "Applied successfully",
      application

    });

  }

  catch (error) {

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.withdrawContractApplication = async (req, res) => {

  try {
    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access contracts" });
    }

    const freelancerId = req.userId;
    const contract = await Contract.findById(req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });
    }

    const application = await Application.findOne({
      contractId: contract._id,
      freelancerId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    // ========================================
    // Validation Rules for Withdrawal
    // ========================================

    if (application.applicationStatus !== "application received") {
      return res.status(400).json({
        success: false,
        message: "You cannot withdraw an application that has already been processed."
      });
    }

    const timeDiffMs = Date.now() - new Date(application.createdAt).getTime();
    const hoursPassed = timeDiffMs / (1000 * 60 * 60);

    if (hoursPassed > 24) {
      return res.status(400).json({
        success: false,
        message: "You cannot withdraw an application after 24 hours of submission."
      });
    }
    await Application.findByIdAndDelete(
      application._id
    );

    await Contract.updateOne(
      { _id: contract._id },
      { $pull: { applicants: { applicationId: application._id } } }
    );

    // Notify client
    try {
      const freelancerUser = await User.findById(freelancerId);
      const clientUser = await User.findById(contract.clientId);
      if (clientUser) {
        await Notification.create({
          userId: contract.clientId,
          role: "client",
          title: "Contract Application Withdrawn",
          message: `${freelancerUser?.registrationDetails?.fullName || "A freelancer"} has withdrawn their application for the contract "${contract.contractTitle}".`,
          link: "/user/hired-talent?tab=offers"
        });

        if (clientUser.registrationDetails?.email) {
          await sendMail.sendMail({
            from: `"Talent Hub" <${process.env.NODE_CODE_SENDING_EMAIL_ADDRESS}>`,
            to: clientUser.registrationDetails.email,
            subject: "Talent Hub - Contract Application Withdrawn",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #D0021B; text-align: center;">Application Withdrawn</h2>
                <p>Hello ${clientUser.registrationDetails.fullName},</p>
                <p><strong>${freelancerUser?.registrationDetails?.fullName || "A freelancer"}</strong> has withdrawn their application for your contract: <strong>${contract.contractTitle}</strong>.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="text-align: center; color: #aaa; font-size: 12px;">© ${new Date().getFullYear()} Talent Hub. All rights reserved.</p>
              </div>
            `
          });
        }
      }
    } catch (err) {
      console.error("Failed to notify client on withdrawal:", err);
    }

    return res.status(200).json({
      success: true,
      message: "Application withdrawn successfully"
    });
  }

  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }

};

exports.getAppliedContracts = async (req, res) => {

  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can access contracts" });
    }

    const freelancerId = req.userId;

    // ========================================
    // Get Applications
    // ========================================

    const applications =
      await Application.find({

        freelancerId

      })

        .populate({

          path: "contractId",

          populate: {

            path: "clientId",

            select:
              "registrationDetails.fullName registrationDetails.email"

          }

        })

        .sort({
          createdAt: -1
        });

    // ========================================
    // Format Response
    // ========================================

    const formattedApplications =
      applications.map((application) => {

        const contract =
          application.contractId;

        if (!contract) return null;

        return {

          // ========================================
          // Application
          // ========================================

          applicationId:
            application._id,

          applicationStatus:
            application.applicationStatus,

          appliedAt:
            application.createdAt,



          assessment:
            application.assessment,

          interview:
            application.interview,

          // ========================================
          // Contract
          // ========================================

          contract: {

            _id:
              contract._id,

            contractTitle:
              contract.contractTitle,

            budgetType:
              contract.budgetType,

            estimatedBudget:
              contract.estimatedBudget,

            contractDescription:
              contract.contractDescription,

            contractStartDate:
              contract.contractStartDate,

            contractEndDate:
              contract.contractEndDate,

            contractType:
              contract.contractType,

            contractSubject:
              contract.contractSubject,
            createdAt:
              contract.createdAt

          },

        };

      })

        .filter(Boolean);

    return res.status(200).json({

      success: true,

      totalApplications:
        formattedApplications.length,

      applications:
        formattedApplications

    });

  }

  catch (error) {

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

exports.getContractApplicants = async (req, res) => {
  try {

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can access this feature"
      });
    }

    const { contractId } = req.query;

    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: "contractId is required"
      });
    }

    const contract = await Contract.findOne({
      _id: contractId,
      clientId: req.userId
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });
    }

    const applications = await Application.find({
      contractId
    })
      .populate({
        path: "freelancerId",
        select: `
          registrationDetails.fullName
          registrationDetails.email
          role
        `
      })
      .sort({ createdAt: -1 });

    const Offer = require("../models/offer");
    const applicants = await Promise.all(
      applications.map(async (application) => {

        const freelancerId =
          application.freelancerId?._id;

        const freelancerProfile =
          freelancerId
            ? await FreelancerProfile.findOne({
                userId: freelancerId
              })
            : null;

        const offer = await Offer.findOne({ applicationId: application._id });

return {
  applicationId: application._id,
  applicationStatus: application.applicationStatus,
  offerStatus: offer ? offer.offerStatus : "none",

  appliedAt: application.createdAt,
  assessment: application.assessment,
  interview: application.interview,

  freelancer: {
    _id: freelancerId || null,
    fullName: freelancerProfile?.basicInformation?.fullName || "N/A",
    email: freelancerProfile?.basicInformation?.email || "N/A",
    profilePhoto: freelancerProfile?.basicInformation?.profilePhoto || "",
    professionalHeadline: freelancerProfile?.basicInformation?.professionalHeadline || "N/A",
    gender: freelancerProfile?.basicInformation?.gender || "N/A",
    country: freelancerProfile?.location?.country || "N/A",
    city: freelancerProfile?.location?.city || "N/A",
    timezone: freelancerProfile?.location?.timezone || "N/A",
    availability: freelancerProfile?.availability || [],
    emailVerified: freelancerProfile?.verification?.emailAddress || false,
    phoneVerified: freelancerProfile?.verification?.phoneNumber || false
  }
};

      })
    );

    return res.status(200).json({
      success: true,
      contractId,
      totalApplicants: applicants.length,
      applicants
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

exports.getHiredTalents = async (req, res) => {
  try {

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can access hired talents"
      });
    }

    const clientId = req.userId;
    const { contractId } = req.params;

    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: "Contract ID is required"
      });
    }

    const Offer = require("../models/offer");
    const hiredOffers = await Offer.find({ clientId, contractId, offerStatus: "accepted"})
      .populate({
        path: "applicationId"
      })
      .populate({
        path: "freelancerId",
        select: ` registrationDetails.fullName registrationDetails.email`
      }).sort({ updatedAt: -1 });

    const hiredTalents = await Promise.all(
      hiredOffers.map(async (offer) => {
        const application = offer.applicationId;
        const freelancerId = offer.freelancerId?._id;
        let profile = null;
        let completedContractsCount = 0;
        if (freelancerId) {

          profile = await FreelancerProfile.findOne({
            userId: freelancerId
          });

          completedContractsCount = await Application.countDocuments({
            freelancerId,
            applicationStatus: "completed"
          });

        }

        return {
          applicationId: application ? application._id : offer.applicationId,
          appliedAt: application ? application.createdAt : offer.createdAt,
          hiredAt: offer.signedAt || offer.updatedAt,
          applicationStatus: application ? application.applicationStatus : "hired",
          offerStatus: offer.offerStatus,
          signatureImage: offer.freelancerSignature || "",
          signedAt: offer.signedAt || null,
          freelancer: {
            _id: freelancerId || null,
            fullName: offer.freelancerId?.registrationDetails?.fullName || "N/A",
            email: offer.freelancerId?.registrationDetails?.email || "N/A",
            profilePhoto: profile?.basicInformation?.profilePhoto || "",
          }

        };

      })
    );

    return res.status(200).json({
      success: true,
      contractId,
      totalHiredTalents: hiredTalents.length,
      hiredTalents
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};