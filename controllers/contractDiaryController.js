const ContractDiary = require("../models/contractDiary");
const Application   = require("../models/application");

// ============================================================
// Helper: fetch diary and verify ownership
// ============================================================
async function getDiaryAndVerify(diaryId, userId, role) {
  const diary = await ContractDiary.findById(diaryId)
    .populate("contractId", "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack")
    .populate("clientId",   "registrationDetails.fullName registrationDetails.email")
    .populate("freelancerId", "registrationDetails.fullName registrationDetails.email");

  if (!diary) return { error: "Contract diary not found", status: 404 };

  if (role === "Client"     && diary.clientId._id.toString()     !== userId.toString())
    return { error: "Unauthorized", status: 403 };

  if (role === "Freelancer" && diary.freelancerId._id.toString() !== userId.toString())
    return { error: "Unauthorized", status: 403 };

  return { diary };
}

// ============================================================
// CLIENT: Initialize diary + add phases for a contract
// POST /api/contract-diary
// Body: { applicationId, phases: [{ name, description, deadline, amount }] }
// ============================================================
exports.initializeDiary = async (req, res) => {
  try {
    if (req.role !== "Client")
      return res.status(403).json({ success: false, message: "Only clients can initialize a contract diary" });

    const { applicationId, phases } = req.body;

    if (!applicationId)
      return res.status(400).json({ success: false, message: "applicationId is required" });

    // Ensure the application exists and belongs to this client
    const application = await Application.findById(applicationId).populate("contractId");
    if (!application)
      return res.status(404).json({ success: false, message: "Application not found" });

    if (application.clientId.toString() !== req.userId.toString())
      return res.status(403).json({ success: false, message: "Unauthorized" });

    if (application.offerStatus !== "accepted")
      return res.status(400).json({ success: false, message: "Diary can only be created for accepted offers" });

    // Check if diary already exists
    const existing = await ContractDiary.findOne({ applicationId });
    if (existing)
      return res.status(409).json({ success: false, message: "A diary already exists for this contract", diaryId: existing._id });

    const diary = await ContractDiary.create({
      applicationId,
      contractId:   application.contractId._id,
      clientId:     application.clientId,
      freelancerId: application.freelancerId,
      overallStatus: "in-progress",
      phases: (phases || []).map(p => ({
        name:        p.name        || "Phase",
        description: p.description || "",
        deadline:    p.deadline    ? new Date(p.deadline) : undefined,
        amount:      p.amount      || 0,
        status:      "pending"
      }))
    });

    return res.status(201).json({ success: true, message: "Contract diary initialized", diary });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CLIENT: Add a phase to an existing diary
// POST /api/contract-diary/:id/phases
// Body: { name, description, deadline, amount }
// ============================================================
exports.addPhase = async (req, res) => {
  try {
    if (req.role !== "Client")
      return res.status(403).json({ success: false, message: "Only clients can add phases" });

    const { diary, error, status } = await getDiaryAndVerify(req.params.id, req.userId, "Client");
    if (error) return res.status(status).json({ success: false, message: error });

    const { name, description, deadline, amount } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Phase name is required" });

    diary.phases.push({ name, description: description || "", deadline: deadline ? new Date(deadline) : undefined, amount: amount || 0, status: "pending" });
    await diary.save();

    return res.status(200).json({ success: true, message: "Phase added", phases: diary.phases });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CLIENT: Update phase status (approve / request changes)
// PUT /api/contract-diary/:id/phases/:phaseId/review
// Body: { action: "approve" | "request-changes", clientFeedback? }
// ============================================================
exports.reviewPhase = async (req, res) => {
  try {
    if (req.role !== "Client")
      return res.status(403).json({ success: false, message: "Only clients can review phases" });

    const { diary, error, status } = await getDiaryAndVerify(req.params.id, req.userId, "Client");
    if (error) return res.status(status).json({ success: false, message: error });

    const phase = diary.phases.id(req.params.phaseId);
    if (!phase) return res.status(404).json({ success: false, message: "Phase not found" });

    const { action, clientFeedback } = req.body;

    if (action === "approve") {
      phase.status     = "approved";
      phase.approvedAt = new Date();
      phase.clientFeedback = clientFeedback || "";
    } else if (action === "request-changes") {
      phase.status         = "changes-requested";
      phase.clientFeedback = clientFeedback || "";
    } else {
      return res.status(400).json({ success: false, message: "action must be 'approve' or 'request-changes'" });
    }

    // Auto-update overall status if all phases are approved
    const allApproved = diary.phases.every(p => p.status === "approved");
    if (allApproved) diary.overallStatus = "completed";

    await diary.save();
    return res.status(200).json({ success: true, message: `Phase ${action}d`, phase });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// CLIENT: Get all diaries for this client's contracts
// GET /api/contract-diary/my-diaries
// ============================================================
exports.getClientDiaries = async (req, res) => {
  try {
    if (req.role !== "Client")
      return res.status(403).json({ success: false, message: "Only clients can access this" });

    const diaries = await ContractDiary.find({ clientId: req.userId })
      .populate("contractId", "contractTitle estimatedBudget budgetType contractStartDate contractEndDate")
      .populate("freelancerId", "registrationDetails.fullName registrationDetails.email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, diaries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// FREELANCER: Get all diaries assigned to this freelancer
// GET /api/contract-diary/my-diary
// ============================================================
exports.getFreelancerDiaries = async (req, res) => {
  try {
    if (req.role !== "Freelancer")
      return res.status(403).json({ success: false, message: "Only freelancers can access this" });

    const diaries = await ContractDiary.find({ freelancerId: req.userId })
      .populate("contractId", "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack")
      .populate("clientId", "registrationDetails.fullName registrationDetails.email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, diaries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// SHARED: Get single diary by ID (client or freelancer)
// GET /api/contract-diary/:id
// ============================================================
exports.getDiaryById = async (req, res) => {
  try {
    const diary = await ContractDiary.findById(req.params.id)
      .populate("contractId", "contractTitle estimatedBudget budgetType contractStartDate contractEndDate contractDescription techStack")
      .populate("clientId",   "registrationDetails.fullName registrationDetails.email")
      .populate("freelancerId", "registrationDetails.fullName registrationDetails.email");

    if (!diary) return res.status(404).json({ success: false, message: "Diary not found" });

    const isOwner =
      diary.clientId._id.toString()     === req.userId.toString() ||
      diary.freelancerId._id.toString()  === req.userId.toString();

    if (!isOwner) return res.status(403).json({ success: false, message: "Unauthorized" });

    return res.status(200).json({ success: true, diary });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// FREELANCER: Submit a phase update (progress note + attachments)
// PUT /api/contract-diary/:id/phases/:phaseId/submit
// Body: { freelancerNote, attachments: [{ fileName, fileUrl, fileType, fileSize }] }
// ============================================================
exports.submitPhaseUpdate = async (req, res) => {
  try {
    if (req.role !== "Freelancer")
      return res.status(403).json({ success: false, message: "Only freelancers can submit phase updates" });

    const { diary, error, status } = await getDiaryAndVerify(req.params.id, req.userId, "Freelancer");
    if (error) return res.status(status).json({ success: false, message: error });

    const phase = diary.phases.id(req.params.phaseId);
    if (!phase) return res.status(404).json({ success: false, message: "Phase not found" });

    const { freelancerNote, attachments } = req.body;

    phase.freelancerNote = freelancerNote || phase.freelancerNote;
    phase.status         = "submitted";
    phase.submittedAt    = new Date();

    if (Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach(a => {
        phase.attachments.push({
          fileName: a.fileName,
          fileUrl:  a.fileUrl,
          fileType: a.fileType  || "",
          fileSize: a.fileSize  || ""
        });
      });
    }

    // Update overall status to in-progress if not already
    if (diary.overallStatus === "not-started") diary.overallStatus = "in-progress";

    await diary.save();
    return res.status(200).json({ success: true, message: "Phase update submitted", phase });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// FREELANCER: Mark a phase as in-progress
// PUT /api/contract-diary/:id/phases/:phaseId/start
// ============================================================
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
    if (diary.overallStatus === "not-started") diary.overallStatus = "in-progress";

    await diary.save();
    return res.status(200).json({ success: true, message: "Phase started", phase });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
