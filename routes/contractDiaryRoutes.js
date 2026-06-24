const express = require("express");
const router  = express.Router();

const {
  addPhase,
  reviewPhase,
  getClientDiaries,
  getFreelancerDiaries,
  getDiaryById,
  submitPhaseUpdate,
  startPhase,
  getDiaryByContractId,
  getFreelancerAllDiaries
} = require("../controllers/contractDiaryController");

const { identifier } = require("../middleware/identifier");

// ============================================================
// Listing Routes (must come before /:id)
// ============================================================

// CLIENT:     GET  /api/contract-diary/my-diaries
router.get("/my-diaries",   identifier, getClientDiaries);
router.get( "/my-diaries-freelancer", identifier, getFreelancerAllDiaries);

// FREELANCER: GET  /api/contract-diary/my-diary
router.get("/my-diary/:contractId",     identifier, getFreelancerDiaries);

router.get("/contract/:contractId", identifier, getDiaryByContractId);

// ============================================================
// Diary CRUD
// ============================================================

// SHARED:  GET  /api/contract-diary/:id
router.get("/:id",          identifier, getDiaryById);

// ============================================================
// Phase Routes
// ============================================================

// CLIENT:     POST /api/contract-diary/:id/phases          (add phase)
router.post("/:id/phases",                         identifier, addPhase);

// CLIENT:     PUT  /api/contract-diary/:id/phases/:phaseId/review
router.put("/:id/phases/:phaseId/review",          identifier, reviewPhase);

// FREELANCER: PUT  /api/contract-diary/:id/phases/:phaseId/start
router.put("/:id/phases/:phaseId/start",           identifier, startPhase);

// FREELANCER: PUT  /api/contract-diary/:id/phases/:phaseId/submit
router.put("/:id/phases/:phaseId/submit",          identifier, submitPhaseUpdate);

module.exports = router;
