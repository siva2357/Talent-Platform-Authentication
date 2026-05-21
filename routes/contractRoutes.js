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

  getContractApplicants
} = require("../controllers/contractController");

const { identifier } = require("../middleware/identifier");



// ========================================
// Client Routes
// ========================================

router.post("/", identifier, createContract);
router.get("/my-contracts", identifier, getMyContracts);
router.get("/my-contracts/:id", identifier, getMyContractById);
router.put("/:id", identifier, updateContract);
router.delete("/:id", identifier, deleteContract);


// ========================================
// Freelancer Routes
// ========================================
router.get("/", identifier, getAllContracts);
router.get("/:id", identifier, getSingleContract);

// Save Contracts
router.post("/save/:id", identifier, saveContract);
router.delete("/unsave/:id", identifier, unsaveContract);
router.get("/saved-contracts", identifier, getSavedContracts);

// Apply Contracts
router.post("/apply/:id", identifier, applyToContract);
router.delete( "/withdraw/:id", identifier, withdrawContractApplication);
router.get( "/applied-contracts", identifier, getAppliedContracts);



router.get( "/my-contracts/:id/applicants", identifier, getContractApplicants);


module.exports = router;