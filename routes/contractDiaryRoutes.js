const express = require("express");
const router  = express.Router();

const {
  initializeDiary,
  addPhase,
  reviewPhase,
  getClientDiaries,
  getFreelancerDiaries,
  getDiaryById,
  submitPhaseUpdate,
  startPhase
} = require("../controllers/contractDiaryController");

const { identifier } = require("../middleware/identifier");

// ============================================================
// Listing Routes (must come before /:id)
// ============================================================

// CLIENT:     GET  /api/contract-diary/my-diaries
router.get("/my-diaries",   identifier, getClientDiaries);

// FREELANCER: GET  /api/contract-diary/my-diary
router.get("/my-diary",     identifier, getFreelancerDiaries);

// ============================================================
// Diary CRUD
// ============================================================

// CLIENT:  POST /api/contract-diary  (initialize diary + phases)
router.post("/",            identifier, initializeDiary);

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
