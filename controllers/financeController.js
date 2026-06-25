const User = require("../models/user");
const Transaction = require("../models/transaction");
const ContractDiary = require("../models/contractDiary");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
let razorpayInstance = null;
const isRazorpayConfigured =
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_ID !== "YOUR_RAZORPAY_KEY_ID" &&
  process.env.RAZORPAY_KEY_SECRET &&
  process.env.RAZORPAY_KEY_SECRET !== "YOUR_RAZORPAY_KEY_SECRET";

if (isRazorpayConfigured) {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch (err) {
    console.error("Failed to initialize Razorpay:", err.message);
  }
}

// ==========================================
// SHARED: Get Finance Stats
// GET /api/finance/stats
// ==========================================
exports.getFinanceStats = async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.role;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (role === "Client") {
      // 1. Available balance
      const totalBalance = user.balance || 0;

      // 2. Total Lifetime Spent & Escrow Balance (calculated dynamically from ContractDiary phases & Escrow Funded transactions)
      const Contract = require("../models/contract");
      const clientContracts = await Contract.find({ clientId: userId });
      const clientDiaries = await ContractDiary.find({ clientId: userId });

      const diarySpentMap = new Map();
      for (const diary of clientDiaries) {
        const spentVal = diary.phases
          .filter(p => p.status === "approved")
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        diarySpentMap.set(diary.contractId.toString(), spentVal);
      }

      const totalSpent = clientContracts.reduce((sum, c) => {
        const contractSpent = diarySpentMap.has(c._id.toString())
          ? diarySpentMap.get(c._id.toString())
          : 0;
        return sum + contractSpent;
      }, 0);

      // Calculate the actual amount funded to escrow by this client
      const escrowFundedTxns = await Transaction.find({
        userId,
        type: "Escrow Funded",
        status: "Paid"
      });
      const totalEscrowFunded = escrowFundedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
      const escrowBalance = Math.max(0, totalEscrowFunded - totalSpent);

      return res.status(200).json({
        success: true,
        stats: {
          totalBalance,
          totalSpent: totalSpent * 1.10,
          upcomingPayments: escrowBalance * 1.10,
          platformFeesPaid: totalSpent * 0.10
        }
      });
    } else if (role === "Freelancer") {
      // 1. Balance Left (unwithdrawn earnings - net available to withdraw)
      const balanceLeft = user.balance || 0;
      const netBalanceLeft = balanceLeft * 0.925;
 
      // 2. Total Earnings
      const earnedTxns = await Transaction.find({ userId, type: "Payment Released" });
      const totalEarnings = earnedTxns.reduce((sum, txn) => sum + txn.amount, 0);
      const netEarnings = totalEarnings * 0.925;
 
      // 3. Amount Withdrawn (net received in bank)
      const withdrawnTxns = await Transaction.find({ userId, type: "Withdrawal" });
      const netWithdrawn = withdrawnTxns.reduce((sum, txn) => sum + (txn.amount - (txn.platformFee || 0)), 0);
 
      return res.status(200).json({
        success: true,
        stats: {
          totalEarnings: netEarnings,
          amountWithdrawn: netWithdrawn,
          balanceLeft: netBalanceLeft,
          platformFeesDeducted: totalEarnings * 0.075
        }
      });
    }

    return res.status(400).json({ success: false, message: "Invalid user role" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CLIENT: Create Razorpay Order
// POST /api/finance/razorpay/order
// Body: { amount }  (amount in USD)
// ==========================================
exports.createRazorpayOrder = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can deposit funds" });
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid deposit amount" });
    }

    // Treat the incoming amount directly as INR and convert to paise (INR * 100)
    const amountInINR = amount;
    const amountInPaise = Math.round(amountInINR * 100);

    const receipt = `receipt_dep_${Date.now()}`;

    // If Razorpay is not configured, send a simulated order details response for easy sandbox testing
    if (!razorpayInstance) {
      console.warn("⚠️ Razorpay is not configured. Returning local test order data.");
      return res.status(200).json({
        success: true,
        isSandbox: true,
        keyId: "YOUR_RAZORPAY_KEY_ID",
        order: {
          id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
          amount: amountInPaise,
          currency: "INR",
          receipt
        }
      });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt
    };

    const order = await razorpayInstance.orders.create(options);

    return res.status(200).json({
      success: true,
      isSandbox: false,
      keyId: process.env.RAZORPAY_KEY_ID,
      order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CLIENT: Verify Razorpay Payment
// POST /api/finance/razorpay/verify
// Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, contractId } (amount in USD)
// ==========================================
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    if (req.role !== "Client") {
      return res.status(403).json({ success: false, message: "Only clients can deposit funds" });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, contractId } = req.body;
    const userId = req.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount parameter" });
    }

    let isVerified = false;

    // Signature verification logic
    if (razorpayInstance && razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      isVerified = (generated_signature === razorpay_signature);
    } else {
      // Mock Sandbox Verification: if keys are not set, auto-approve for demonstration purposes
      console.warn("⚠️ Using local mock verification for payment.");
      isVerified = true;
    }

    if (!isVerified) {
      return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
    }

    // Add funds or fund contract independently
    const user = await User.findById(userId);
    const txnRef = razorpay_payment_id || `txn_mock_${Math.random().toString(36).substring(2, 11)}`;

    if (contractId) {
      const Contract = require("../models/contract");
      const contract = await Contract.findById(contractId);
      if (contract) {
        // The amount passed contains the 10% platform fee.
        // E.g. If client paid 550, then base contract fund is 500, fee is 50.
        const grossAmount = parseFloat(amount);
        const baseAmount = Math.round((grossAmount / 1.10) * 100) / 100;
        const platformFee = Math.round((grossAmount - baseAmount) * 100) / 100;

        // Log the Escrow Funded transaction (funds are held in escrow, not spent yet)
        await Transaction.create({
          userId,
          contractId,
          type: "Escrow Funded",
          amount: baseAmount,
          platformFee: platformFee,
          status: "Paid",
          description: `Funded contract: ${contract.contractTitle}`,
          referenceId: `pay_${txnRef}`
        });
      } else {
        return res.status(404).json({ success: false, message: "Contract not found" });
      }
    } else {
      // Wallet Deposit: credit client wallet balance
      user.balance = (user.balance || 0) + parseFloat(amount);
      await user.save();

      // Log the Deposit transaction
      await Transaction.create({
        userId,
        type: "Deposit",
        amount: parseFloat(amount),
        platformFee: 0,
        status: "Paid",
        description: `Deposited ₹${amount} to wallet via Razorpay`,
        referenceId: txnRef
      });
    }

    return res.status(200).json({
      success: true,
      message: contractId ? "Contract successfully funded!" : "Funds successfully added to your wallet!",
      balance: user.balance
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FREELANCER: Withdraw Funds
// POST /api/finance/withdraw
// Body: { amount }
// ==========================================
exports.withdrawFunds = async (req, res) => {
  try {
    if (req.role !== "Freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can withdraw earnings" });
    }

    const { amount, contractId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal amount" });
    }

    const userId = req.userId;
    const user = await User.findById(userId);

    if ((user.balance || 0) < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance to withdraw this amount." });
    }

    if (contractId) {
      const ContractDiary = require("../models/contractDiary");
      const diary = await ContractDiary.findOne({ contractId: contractId });
      if (diary && diary.overallStatus !== 'completed' && diary.overallStatus !== 'cancelled') {
        return res.status(400).json({ success: false, message: "Withdrawals are only permitted after the contract is completed." });
      }
    }

    // Deduct from balance
    user.balance = (user.balance || 0) - parseFloat(amount);
    await user.save();

    // Log Transaction
    const referenceId = `WDN-${Math.floor(100000 + Math.random() * 900000)}`;
    const grossAmount = parseFloat(amount);
    const platformFee = Math.round((grossAmount * 0.075) * 100) / 100;
    const netReceived = Math.round((grossAmount - platformFee) * 100) / 100;

    const transaction = await Transaction.create({
      userId,
      contractId: contractId || null,
      type: "Withdrawal",
      amount: grossAmount,
      platformFee: platformFee,
      status: "Processed",
      description: `Withdrew ₹${grossAmount.toFixed(2)} from balance to local bank account (Net received: ₹${netReceived.toFixed(2)} after 7.5% platform fee)`,
      referenceId
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawal request processed successfully",
      balance: user.balance,
      transaction
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SHARED: Get Full Transactions List
// GET /api/finance/transactions
// ==========================================
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.userId;

    const transactions = await Transaction.find({ userId })
      .populate("contractId", "contractTitle")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      transactions
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SHARED: Get Invoices (Completed transaction logs)
// GET /api/finance/invoices
// ==========================================
exports.getInvoices = async (req, res) => {
  try {
    const userId = req.userId;

    // Filter to paid deposits, escrow funding, and payouts
    const invoices = await Transaction.find({
      userId,
      status: "Paid"
    })
      .populate("contractId", "contractTitle contractStartDate contractEndDate")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      invoices
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CLIENT: Download Transaction Invoice PDF
// GET /api/finance/invoices/:id/download
// ==========================================
exports.downloadInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const Transaction = require("../models/transaction");
    const User = require("../models/user");
    const ejs = require("ejs");
    const puppeteer = require("puppeteer");
    const path = require("path");

    // Find the transaction
    const txn = await Transaction.findById(id).populate("contractId");
    if (!txn) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Ensure the client requesting is the owner of this transaction
    if (txn.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized access to transaction" });
    }

    const client = await User.findById(userId);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const formatDate = (dateVal) => {
      if (!dateVal) return "N/A";
      const d = new Date(dateVal);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    };

    // Prepare EJS template variables
    const data = {
      invoiceNumber: `INV-${txn._id.toString().substring(0, 8).toUpperCase()}`,
      invoiceDate: formatDate(new Date()),
      paymentDate: formatDate(txn.createdAt),
      referenceId: txn.referenceId,
      clientName: client.fullName || client.registrationDetails?.fullName || "Client",
      clientEmail: client.email || "client@talenthub.com",
      contractTitle: txn.contractId?.contractTitle || "Direct Escrow Deposit",
      contractType: txn.contractId?.contractType || "N/A",
      contractSubject: txn.contractId?.contractSubject || "N/A",
      amountPaid: txn.amount.toFixed(2),
      platformFee: (txn.platformFee || 0).toFixed(2),
      totalCharged: ((txn.amount || 0) + (txn.platformFee || 0)).toFixed(2)
    };

    // Render EJS HTML
    const templatePath = path.join(__dirname, "..", "views", "contract-invoice.ejs");
    const html = await ejs.renderFile(templatePath, data);

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm"
      },
      printBackground: true
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Invoice_${data.invoiceNumber}.pdf"`);
    res.end(pdfBuffer, "binary");
    return;

  } catch (error) {
    console.error("Invoice PDF generation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FREELANCER: Download Payment Statement PDF
// GET /api/finance/payments/:contractId/download
// ==========================================
exports.downloadPaymentStatementPdf = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.userId;

    const ContractDiary = require("../models/contractDiary");
    const User = require("../models/user");
    const FreelancerProfile = require("../models/freelancerProfile");
    const ejs = require("ejs");
    const puppeteer = require("puppeteer");
    const path = require("path");

    // Find the contract diary and populate related details
    const diary = await ContractDiary.findOne({ contractId, freelancerId: userId })
      .populate("contractId")
      .populate("clientId")
      .populate("freelancerId");

    if (!diary) {
      return res.status(404).json({ success: false, message: "Contract diary not found or unauthorized access" });
    }

    const freelancerProfile = await FreelancerProfile.findOne({ userId });

    const formatDate = (dateVal) => {
      if (!dateVal) return "N/A";
      const d = new Date(dateVal);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    };

    // Calculate dynamic values
    const approvedPhases = (diary.phases || []).filter(p => p.status === "approved");
    const amountPaid = approvedPhases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const serviceFee = Math.round((amountPaid * 0.075) * 100) / 100;
    const earnings = Math.round((amountPaid - serviceFee) * 100) / 100;

    const projectDuration = `${formatDate(diary.contractId?.contractStartDate)} - ${formatDate(diary.contractId?.contractEndDate)}`;

    // Prepare EJS template variables for contract-payment.ejs
    const data = {
      date: formatDate(new Date()),
      contractId: diary.contractId?._id?.toString() || contractId,
      freelancerName: diary.freelancerId?.registrationDetails?.fullName || "Freelancer",
      freelancerTitle: freelancerProfile?.basicInformation?.professionalHeadline || "Freelancer",
      freelancerLocation: freelancerProfile?.location?.city && freelancerProfile?.location?.country
        ? `${freelancerProfile.location.city}, ${freelancerProfile.location.country}`
        : "Remote",
      clientName: diary.clientId?.registrationDetails?.fullName || "Client",
      contractTitle: diary.contractId?.contractTitle || "Contract Project",
      contractType: diary.contractId?.contractType || "N/A",
      projectDuration,
      amountPaid: amountPaid.toFixed(2),
      serviceFee: serviceFee.toFixed(2),
      earnings: earnings.toFixed(2)
    };

    // Render EJS HTML
    const templatePath = path.join(__dirname, "..", "views", "contract-payment.ejs");
    const html = await ejs.renderFile(templatePath, data);

    // Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm"
      },
      printBackground: true
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Payment_Statement_${data.contractId}.pdf"`);
    res.end(pdfBuffer, "binary");
    return;

  } catch (error) {
    console.error("Payment statement PDF generation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// CLIENT: Get Contract-wise Transactions (for Accordion UI)
// GET /api/finance/contract-transactions
// ==========================================
exports.getContractTransactions = async (req, res) => {
  try {
    if (req.role !== "Client") {
       return res.status(403).json({ success: false, message: "Only clients can access this" });
    }
    
    // Fetch ContractDiaries, populating just what we need
    const diaries = await ContractDiary.find({ clientId: req.userId })
      .select("contractId freelancerId phases overallStatus")
      .populate("contractId", "contractTitle estimatedBudget budgetType")
      .populate("freelancerId", "registrationDetails.fullName")
      .sort({ updatedAt: -1 })
      .lean();

    // Strip out heavy phase data (revisions, attachments, descriptions)
    const strippedDiaries = diaries.map(diary => {
      return {
        _id: diary._id,
        overallStatus: diary.overallStatus,
        contractId: diary.contractId,
        freelancerId: diary.freelancerId,
        phases: (diary.phases || []).map(p => ({
          _id: p._id,
          name: p.name,
          deadline: p.deadline,
          amount: p.amount,
          status: p.status
        }))
      };
    });

    return res.status(200).json({ success: true, diaries: strippedDiaries });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// FREELANCER: Get Finance Report (Combined Diaries & Txns)
// GET /api/finance/freelancer-report
// ==========================================
exports.getFreelancerFinanceReport = async (req, res) => {
  try {
    if (req.role !== "Freelancer") {
       return res.status(403).json({ success: false, message: "Only freelancers can access this" });
    }

    const userId = req.userId;
    
    // 1. Get all contract diaries for this freelancer
    const diaries = await ContractDiary.find({ freelancerId: userId })
      .populate("contractId", "contractTitle budgetType contractStartDate contractEndDate estimatedBudget")
      .populate("clientId", "registrationDetails.fullName")
      .sort({ updatedAt: -1 })
      .lean();

    // 2. Get all transactions for this freelancer
    const txns = await Transaction.find({ userId }).lean();

    // 3. Map and calculate finance data per contract
    const reportData = diaries.map(diary => {
      const contractId = diary.contractId?._id?.toString() || null;

      // Filter transactions associated with this contract
      const contractTxns = txns.filter(t => t.contractId && t.contractId.toString() === contractId);

      const receivedAmount = contractTxns
        .filter(t => t.type === 'Payment Released')
        .reduce((sum, t) => sum + t.amount, 0);

      const withdrawnAmount = contractTxns
        .filter(t => t.type === 'Withdrawal')
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = Math.max(0, receivedAmount - withdrawnAmount);

      const approvedPhases = (diary.phases || []).filter(p => p.status === 'approved');
      const earned = approvedPhases.reduce((sum, p) => sum + (p.amount || 0), 0);
      const budget = (diary.phases || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPhases = (diary.phases || []).length;
      const completion = totalPhases > 0 ? Math.round((approvedPhases.length / totalPhases) * 100) : 0;

      let mappedStatus = 'Ongoing';
      if (diary.overallStatus === 'completed') mappedStatus = 'Completed';
      else if (diary.overallStatus === 'cancelled') mappedStatus = 'Cancelled';

      // Find last payment date
      let lastPaymentDate = null;
      if (approvedPhases.length > 0) {
        const sorted = approvedPhases.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
        lastPaymentDate = sorted[0].approvedAt;
      }

      const strippedPhases = (diary.phases || []).map(p => {
        let pStatus = 'Pending';
        if (p.status === 'approved') pStatus = 'Paid';
        else if (p.status === 'submitted') pStatus = 'In Review';
        else if (p.status === 'changes-requested') pStatus = 'Changes Requested';
        else if (p.status === 'in-progress') pStatus = 'In Progress';

        return {
          name: p.name,
          amount: p.amount || 0,
          status: pStatus,
          date: p.approvedAt || null
        };
      });

      return {
        contractId,
        title: diary.contractId?.contractTitle || 'Contract',
        client: diary.clientId?.registrationDetails?.fullName || 'Client',
        budget,
        earned,
        status: mappedStatus,
        type: diary.contractId?.budgetType || 'Fixed Price',
        startDate: diary.contractId?.contractStartDate || diary.createdAt,
        endDate: diary.contractId?.contractEndDate || diary.updatedAt,
        completion,
        balance,
        withdrawnAmount,
        receivedAmount,
        lastPaymentDate,
        phases: strippedPhases
      };
    });

    return res.status(200).json({ success: true, report: reportData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
