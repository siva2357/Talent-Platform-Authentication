const express = require("express");
const router = express.Router();

const {
  createContract,
  getAllContracts,
  getSingleContract,
  getMyContracts,
  getMyContractById,
  updateContract,
  deleteContract,

  saveContract,
  unsaveContract,
  getSavedContracts,

  applyToContract,
  withdrawContractApplication,
  getAppliedContracts,

  getContractApplicants,
  getHiredTalents
} = require("../controllers/contractController");

const { identifier } = require("../middleware/identifier");



// ========================================
// Client Routes
// ========================================
router.get("/my-contracts/applicants", identifier, getContractApplicants);
router.get("/hired-talents", identifier, getHiredTalents);
router.post("/", identifier, createContract);
router.get("/my-contracts", identifier, getMyContracts);
router.get("/my-contracts/:id", identifier, getMyContractById);
router.put("/:id", identifier, updateContract);
router.delete("/:id", identifier, deleteContract);


// ========================================
// Freelancer Routes
// ========================================
router.get("/", identifier, getAllContracts);

// Save Contracts
router.post("/save/:id", identifier, saveContract);
router.delete("/unsave/:id", identifier, unsaveContract);
router.get("/saved-contracts", identifier, getSavedContracts);

// Apply Contracts
router.post("/apply/:id", identifier, applyToContract);
router.delete( "/withdraw/:id", identifier, withdrawContractApplication);
router.get( "/applied-contracts", identifier, getAppliedContracts);

// Get Single Contract (must be placed after static routes)
router.get("/:id", identifier, getSingleContract);





module.exports = router;