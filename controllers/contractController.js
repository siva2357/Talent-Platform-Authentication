
const Contract = require("../models/contract");
const ClientProfile = require("../models/clientProfile");

// ========================================
// Create Contract
// ========================================
exports.createContract = async (req, res) => {
  try {
    const clientId = req.userId;
    const { contractTitle, budgetType, estimatedBudget, contractStartDate, contractEndDate, contractDescription } = req.body;
    if (new Date(contractEndDate) < new Date(contractStartDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be greater than start date"
      });
    }

    const contract = await Contract.create({
      clientId,
      contractTitle,
      budgetType,
      estimatedBudget,
      contractStartDate,
      contractEndDate,
      contractDescription
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


// ========================================
// Get Logged In Client Contracts
// ========================================
exports.getMyContracts = async (req, res) => {

  try {

    const clientId = req.userId;

    const contracts = await Contract.find(
      { clientId },
      {
        contractDescription: 0
      }
    )
    .sort({
      createdAt: -1
    });

    return res.status(200).json({

      success: true,

      totalContracts: contracts.length,

      contracts

    });

  }

  catch (error) {

    return res.status(500).json({

      success: false,

      message: error.message

    });

  }

};

// ========================================
// Get My Single Contract
// ========================================
exports.getMyContractById = async (req, res) => {
  try {

    const clientId = req.userId;

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

    return res.status(200).json({
      success: true,
      contract
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// =============================
// Update Full Contract
// =============================
exports.updateContract = async (req, res) => {
  try {
    const clientId = req.userId;
    const {
      contractTitle,
      budgetType,
      estimatedBudget,
      contractStartDate,
      contractEndDate,
      contractDescription,
      status
    } = req.body;

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

    if (contractTitle !== undefined) {
      contract.contractTitle = contractTitle;
    }

    if (budgetType !== undefined) {
      contract.budgetType = budgetType;
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

    if (status !== undefined) {
      contract.status = status;
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

// =============================
// Delete Contract
// =============================
exports.deleteContract = async (req, res) => {
  try {
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



// ========================================
// Get All Contracts (Freelancer)
// ========================================

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

        return {
          _id: contract._id,
          clientName:  contract.clientId?.registrationDetails?.fullName || "",
          clientType: clientProfile?.professionalDetails?.clientType || "",
          website: clientProfile?.professionalDetails?.website || "",
          industry: clientProfile?.professionalDetails?.industry || "",
          contractTitle: contract.contractTitle,
          budgetType: contract.budgetType,
          estimatedBudget: contract.estimatedBudget,
          contractDescription: contract.contractDescription,
          contractStartDate: contract.contractStartDate,
          contractEndDate: contract.contractEndDate,
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

// ========================================
// Get Single Contract (Freelancer)
// ========================================

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
          clientProfile?.professionalDetails?.website || "",

        industry:
          clientProfile?.professionalDetails?.industry || "",

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

        totalDuration,

        status:
          contract.status,

        totalApplicants:
          contract.applicants?.length || 0,

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

// ========================================
// Save Contract
// ========================================
exports.saveContract = async (req, res) => {

  try {

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


// ========================================
// Unsave Contract
// ========================================
exports.unsaveContract = async (req, res) => {

  try {

    const freelancerId = req.userId;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {

      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });

    }

    contract.savedBy = contract.savedBy.filter(
      (id) => id.toString() !== freelancerId.toString()
    );

    await contract.save();

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


// ========================================
// Get Saved Contracts
// ========================================
exports.getSavedContracts = async (req, res) => {

  try {

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

    return res.status(200).json({
      success: true,
      totalContracts: contracts.length,
      contracts
    });

  }

  catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};


// ========================================
// Apply To Contract
// ========================================
exports.applyToContract = async (req, res) => {

  try {

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
        applicant.freelancerId.toString() === freelancerId.toString()
    );

    if (alreadyApplied) {

      return res.status(400).json({
        success: false,
        message: "Already applied to this contract"
      });

    }

    contract.applicants.push({
      freelancerId
    });

    await contract.save();

    return res.status(200).json({
      success: true,
      message: "Applied successfully"
    });

  }

  catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};


// ========================================
// Withdraw Contract Application
// ========================================
exports.withdrawContractApplication = async (req, res) => {

  try {

    const freelancerId = req.userId;

    const contract = await Contract.findById(req.params.id);

    if (!contract) {

      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });

    }

    contract.applicants = contract.applicants.filter(
      (applicant) =>
        applicant.freelancerId.toString() !== freelancerId.toString()
    );

    await contract.save();

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


// ========================================
// Get Applied Contracts
// ========================================
exports.getAppliedContracts = async (req, res) => {

  try {

    const freelancerId = req.userId;

    const contracts = await Contract.find({
      "applicants.freelancerId": freelancerId
    })
    .populate(
      "clientId",
      "registrationDetails.fullName registrationDetails.email"
    )
    .sort({
      createdAt: -1
    });

    return res.status(200).json({

      success: true,

      totalContracts: contracts.length,

      contracts

    });

  }

  catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};



// ========================================
// Get Contract Applicants / Proposals
// ========================================
exports.getContractApplicants = async (req, res) => {
  try {
    const clientId = req.userId;
    const contract = await Contract.findOne({
      _id: req.params.id,
      clientId
    })
    .populate({
      path: "applicants.freelancerId",
      select: `
        registrationDetails.fullName
        registrationDetails.email
        role
      `
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });
    }

    return res.status(200).json({
      success: true,
      totalApplicants: contract.applicants.length,
      applicants: contract.applicants
    });

  }

  catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};