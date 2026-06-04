const express = require("express");
const router = express.Router();
const {
  getFinanceStats,
  createRazorpayOrder,
  verifyRazorpayPayment,
  withdrawFunds,
  getTransactions,
  getInvoices,
  downloadInvoicePdf,
  downloadPaymentStatementPdf
} = require("../controllers/financeController");
const { identifier } = require("../middleware/identifier");

router.get("/stats", identifier, getFinanceStats);
router.get("/transactions", identifier, getTransactions);
router.get("/invoices", identifier, getInvoices);
router.get("/invoices/:id/download", identifier, downloadInvoicePdf);
router.get("/payments/:contractId/download", identifier, downloadPaymentStatementPdf);

router.post("/razorpay/order", identifier, createRazorpayOrder);
router.post("/razorpay/verify", identifier, verifyRazorpayPayment);

router.post("/withdraw", identifier, withdrawFunds);

module.exports = router;
