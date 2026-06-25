const ContractDiary = require("../models/contractDiary");
const Application   = require("../models/application");
const User          = require("../models/user");
const Transaction   = require("../models/transaction");
const Contract      = require("../models/contract");


async function getDiaryAndVerify(diaryId, userId, role) {
  const diary = await ContractDiary.findById(diaryId)
    .populate("contractId", "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack spent")
    .populate("clientId",   "registrationDetails.fullName registrationDetails.email")
    .populate("freelancerId", "registrationDetails.fullName registrationDetails.email");

  if (!diary) return { error: "Contract diary not found", status: 404 };

  if (role === "Client"     && diary.clientId._id.toString()     !== userId.toString())
    return { error: "Unauthorized", status: 403 };

  if (role === "Freelancer" && diary.freelancerId._id.toString() !== userId.toString())
    return { error: "Unauthorized", status: 403 };

  return { diary };
}


async function syncContractStatus(diary) {

  const contract = await Contract.findById(
    diary.contractId._id || diary.contractId
  );

  if (!contract) return;

  const phases = diary.phases || [];


  if (
    contract.status === "pending" &&
    phases.some(p =>
      [
        "in-progress",
        "submitted",
        "changes-requested",
        "approved"
      ].includes(p.status)
    )
  ) {
    // Only automatically transition from pending to in-progress when work starts
    diary.overallStatus = "in-progress";
    contract.status = "in progress";
  } else {
    // Otherwise, keep the status in sync with the main Contract's status
    if (contract.status === 'completed') {
      diary.overallStatus = 'completed';
    } else if (contract.status === 'in progress') {
      diary.overallStatus = 'in-progress';
    } else {
      diary.overallStatus = 'not-started';
    }
  }

  contract.spent =
    phases
      .filter(p => p.status === "approved")
      .reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

  await contract.save();
}



exports.addPhase = async (req, res) => {
  try {
    if (req.role !== "Client")
      return res.status(403).json({ success: false, message: "Only clients can add phases" });

    const { diary, error, status } = await getDiaryAndVerify(req.params.id, req.userId, "Client");
    if (error) return res.status(status).json({ success: false, message: error });

    const { name, description, deadline, amount, clientAttachments } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Phase name is required" });

    const phaseAmount = parseFloat(amount) || 0;

    // Get contract details
    const contract = diary.contractId;
    if (!contract) {
      return res.status(400).json({ success: false, message: "Associated contract not found" });
    }

    const totalBudget = contract.estimatedBudget || 0;
    const totalAllocated = diary.phases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingBudget = Math.round((totalBudget - totalAllocated) * 100) / 100;

    if (phaseAmount > remainingBudget) {
      return res.status(400).json({
        success: false,
        message: `Insufficient remaining contract budget ($${remainingBudget.toFixed(2)}) to allocate for this phase ($${phaseAmount.toFixed(2)}). Total contract budget is $${totalBudget.toFixed(2)}.`
      });
    }

    const mappedClientAttachments = [];
    if (Array.isArray(clientAttachments) && clientAttachments.length > 0) {
      clientAttachments.forEach(a => {
        mappedClientAttachments.push({
          fileName: a.fileName,
          fileUrl:  a.fileUrl,
          fileType: a.fileType || "",
          fileSize: a.fileSize || ""
        });
      });
    }

    diary.phases.push({
      name,
      description: description || "",
      deadline: deadline ? new Date(deadline) : undefined,
      amount: phaseAmount,
      status: "pending",
      clientAttachments: mappedClientAttachments
    });
    await syncContractStatus(
  diary
);

await diary.save();

    return res.status(200).json({ success: true, message: "Phase added and funded successfully", phases: diary.phases });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.reviewPhase = async (req, res) => {
  try {

    if (req.role !== "Client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can review phases"
      });
    }

    const { diary, error, status } = await getDiaryAndVerify(
      req.params.id,
      req.userId,
      "Client"
    );

    if (error) {
      return res.status(status).json({
        success: false,
        message: error
      });
    }

    const phase = diary.phases.id(
      req.params.phaseId
    );

    if (!phase) {
      return res.status(404).json({
        success: false,
        message: "Phase not found"
      });
    }

    const latestRevision =
      phase.revisions[
        phase.revisions.length - 1
      ];

    if (!latestRevision) {
      return res.status(400).json({
        success: false,
        message: "No submission found for this phase"
      });
    }

    const {
      action,
      clientFeedback
    } = req.body;

    if (action === "approve") {

      if (phase.status === "approved") {
        return res.status(400).json({
          success: false,
          message: "This phase is already approved"
        });
      }

      latestRevision.status =
        "approved";

      latestRevision.clientFeedback =
        clientFeedback || "";

      latestRevision.reviewedAt =
        new Date();

      phase.status =
        "approved";

      phase.approvedAt =
        new Date();

      const phaseAmount =
        phase.amount || 0;

      if (phaseAmount > 0) {

        const fundedTxns =
          await Transaction.find({
            contractId:
              diary.contractId._id,
            type:
              "Escrow Funded",
            status:
              "Paid"
          });

        const totalContractFunded =
          fundedTxns.reduce(
            (sum, txn) =>
              sum + (txn.amount || 0),
            0
          );

        const contract =
          await Contract.findById(
            diary.contractId._id
          );

        const currentContractSpent =
          contract?.spent || 0;

        const contractEscrowBalance =
          totalContractFunded -
          currentContractSpent;

        if (
          phaseAmount >
          contractEscrowBalance
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Insufficient contract escrow balance"
          });
        }

        const freelancer =
          await User.findById(
            diary.freelancerId
          );

        if (!freelancer) {
          return res.status(404).json({
            success: false,
            message:
              "Freelancer not found"
          });
        }

        freelancer.balance =
          (freelancer.balance || 0) +
          phaseAmount;

        await freelancer.save();

        await Transaction.create({
          userId:
            diary.clientId,
          contractId:
            diary.contractId._id,
          type:
            "Payment Released",
          amount:
            phaseAmount,
          platformFee:
            0,
          status:
            "Paid",
          description:
            `Escrow payment released for phase "${phase.name}"`,
          referenceId:
            `REL-${Math.floor(
              100000 +
              Math.random() * 900000
            )}`
        });

        await Transaction.create({
          userId:
            diary.freelancerId,
          contractId:
            diary.contractId._id,
          type:
            "Payment Released",
          amount:
            phaseAmount,
          platformFee:
            0,
          status:
            "Paid",
          description:
            `Escrow payment received for phase "${phase.name}"`,
          referenceId:
            `REL-${Math.floor(
              100000 +
              Math.random() * 900000
            )}`
        });

      }

    } else if (
      action ===
      "request-changes"
    ) {

      latestRevision.status =
        "changes-requested";

      latestRevision.clientFeedback =
        clientFeedback || "";

      latestRevision.reviewedAt =
        new Date();

      phase.status =
        "changes-requested";

    } else {

      return res.status(400).json({
        success: false,
        message:
          "action must be 'approve' or 'request-changes'"
      });

    }

    await syncContractStatus(
      diary
    );

    await diary.save();

    return res.status(200).json({
      success: true,
      message:
        `Phase ${action}d successfully`,
      phase
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getClientDiaries = async (req, res) => {
  try {
    if (req.role !== "Client")
      return res.status(403).json({ success: false, message: "Only clients can access this" });

    const diaries = await ContractDiary.find({ clientId: req.userId })
      .populate("contractId", "contractTitle estimatedBudget budgetType contractStartDate contractEndDate spent")
      .populate("freelancerId", "registrationDetails.fullName registrationDetails.email")
      .sort({ updatedAt: -1 });

    const formattedDiaries = await Promise.all(diaries.map(async (diary) => {
      const diaryObj = diary.toObject();
      if (diaryObj.contractId) {
        const spentVal = (diaryObj.phases || [])
          .filter(p => p.status === "approved")
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        diaryObj.contractId.spent = spentVal;

        const fundedTxns = await Transaction.find({
          contractId: diaryObj.contractId._id,
          type: "Escrow Funded",
          status: "Paid"
        });
        diaryObj.contractId.funded = fundedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
      }
      return diaryObj;
    }));

    return res.status(200).json({ success: true, diaries: formattedDiaries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFreelancerDiaries = async (req, res) => {
  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can access this"
      });
    }

    const { contractId } = req.params;

    const diary = await ContractDiary.findOne({
      contractId,
      freelancerId: req.userId
    })
      .populate(
        "contractId",
        "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack spent"
      )
      .populate(
        "clientId",
        "registrationDetails.fullName registrationDetails.email"
      );

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Contract diary not found"
      });
    }

    const diaryObj = diary.toObject();

    if (diaryObj.contractId) {

      const spentVal = (diaryObj.phases || [])
        .filter(p => p.status === "approved")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      diaryObj.contractId.spent = spentVal;

      const fundedTxns = await Transaction.find({
        contractId: diaryObj.contractId._id,
        type: "Escrow Funded",
        status: "Paid"
      });

      diaryObj.contractId.funded = fundedTxns.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );

    }

    return res.status(200).json({
      success: true,
      diary: diaryObj
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.getDiaryById = async (req, res) => {
  try {
    const diary = await ContractDiary.findById(req.params.id)
      .populate("contractId", "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack spent")
      .populate("clientId",   "registrationDetails.fullName registrationDetails.email")
      .populate("freelancerId", "registrationDetails.fullName registrationDetails.email");

    if (!diary) return res.status(404).json({ success: false, message: "Diary not found" });

    const isOwner =
      diary.clientId._id.toString()     === req.userId.toString() ||
      diary.freelancerId._id.toString()  === req.userId.toString();

    if (!isOwner) return res.status(403).json({ success: false, message: "Unauthorized" });

    const diaryObj = diary.toObject();
    if (diaryObj.contractId) {
      const spentVal = (diaryObj.phases || [])
        .filter(p => p.status === "approved")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      diaryObj.contractId.spent = spentVal;

      const fundedTxns = await Transaction.find({
        contractId: diaryObj.contractId._id,
        type: "Escrow Funded",
        status: "Paid"
      });
      diaryObj.contractId.funded = fundedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    }

    return res.status(200).json({ success: true, diary: diaryObj });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitPhaseUpdate = async (req, res) => {
  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can submit phase updates"
      });
    }

    const { diary, error, status } = await getDiaryAndVerify(
      req.params.id,
      req.userId,
      "Freelancer"
    );

    if (error) {
      return res.status(status).json({
        success: false,
        message: error
      });
    }

    const phase = diary.phases.id(req.params.phaseId);

    if (!phase) {
      return res.status(404).json({
        success: false,
        message: "Phase not found"
      });
    }

    const {
      freelancerNote,
      attachments = []
    } = req.body;

    const revisionAttachments = attachments.map(file => ({
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType || "",
      fileSize: file.fileSize || ""
    }));

    phase.revisions.push({
      freelancerNote: freelancerNote || "",
      attachments: revisionAttachments,
      status: "submitted",
      submittedAt: new Date()
    });

    phase.revisionCount += 1;
    phase.status = "submitted";
    phase.submittedAt = new Date();

await syncContractStatus(
  diary
);

await diary.save();

    return res.status(200).json({
      success: true,
      message: "Phase update submitted successfully",
      phase
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

exports.startPhase = async (req, res) => {
  try {
    if (req.role !== "Freelancer")
      return res.status(403).json({ success: false, message: "Only freelancers can start phases" });

    const { diary, error, status } = await getDiaryAndVerify(req.params.id, req.userId, "Freelancer");
    if (error) return res.status(status).json({ success: false, message: error });

    const phase = diary.phases.id(req.params.phaseId);
    if (!phase) return res.status(404).json({ success: false, message: "Phase not found" });

    if (phase.status !== "pending" && phase.status !== "changes-requested")
      return res.status(400).json({ success: false, message: "Phase cannot be started in its current state" });

    phase.status = "in-progress";

await syncContractStatus(
  diary
);

await diary.save();

    return res.status(200).json({ success: true, message: "Phase started", phase });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.getDiaryByContractId = async (req, res) => {
  try {

    const contract = await Contract.findById(
      req.params.contractId
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found"
      });
    }

    const application = await Application.findOne({
      contractId: contract._id,
      applicationStatus: "shortlisted"
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "No hired freelancer found"
      });
    }

    let diary = await ContractDiary.findOne({
      contractId: contract._id
    });

    if (!diary) {

      diary = await ContractDiary.create({

        applicationId: application._id,

        contractId: contract._id,

        clientId: contract.clientId,

        freelancerId: application.freelancerId,

        overallStatus: "not-started",

        phases: []

      });

    }

    diary = await ContractDiary.findById(
      diary._id
    )
      .populate(
        "contractId",
        "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack spent"
      )
      .populate(
        "clientId",
        "registrationDetails.fullName registrationDetails.email"
      )
      .populate(
        "freelancerId",
        "registrationDetails.fullName registrationDetails.email"
      );

    const fundedTxns = await Transaction.find({
      contractId: contract._id,
      type: "Escrow Funded",
      status: "Paid"
    });
    const funded = fundedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

    return res.status(200).json({

      success: true,

      contract: {
        _id: contract._id,
        contractTitle: contract.contractTitle,
        estimatedBudget: contract.estimatedBudget,
        budgetType: contract.budgetType,
        contractStartDate: contract.contractStartDate,
        contractEndDate: contract.contractEndDate,
        contractDescription: contract.contractDescription,
        techStack: contract.techStack,
        spent: contract.spent || 0,
        funded
      },

      diary

    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};


exports.getFreelancerAllDiaries = async (req, res) => {
  try {

    if (req.role !== "Freelancer") {
      return res.status(403).json({
        success: false,
        message: "Only freelancers can access this"
      });
    }

    const diaries = await ContractDiary.find({
      freelancerId: req.userId
    })
      .populate(
        "contractId",
        "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack spent"
      )
      .populate(
        "clientId",
        "registrationDetails.fullName registrationDetails.email"
      )
      .sort({ updatedAt: -1 });

    const formattedDiaries = await Promise.all(
      diaries.map(async (diary) => {

        const diaryObj = diary.toObject();

        if (diaryObj.contractId) {

          const spentVal = (diaryObj.phases || [])
            .filter(p => p.status === "approved")
            .reduce(
              (sum, p) => sum + (p.amount || 0),
              0
            );

          diaryObj.contractId.spent = spentVal;

          const fundedTxns = await Transaction.find({
            contractId: diaryObj.contractId._id,
            type: "Escrow Funded",
            status: "Paid"
          });

          diaryObj.contractId.funded =
            fundedTxns.reduce(
              (sum, t) => sum + (t.amount || 0),
              0
            );
        }

        return diaryObj;
      })
    );

    return res.status(200).json({
      success: true,
      diaries: formattedDiaries
    });

  } catch (err) {

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};