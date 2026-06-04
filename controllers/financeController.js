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

      // 2. Total Lifetime Spent
      const spentTxns = await Transaction.find({ userId, type: "Payment Released" });
      const totalSpent = spentTxns.reduce((sum, txn) => sum + txn.amount, 0);

      // 3. Upcoming Milestones / Escrowed Funds (Funded but not yet approved/released phases)
      const diaries = await ContractDiary.find({ clientId: userId });
      let upcomingPayments = 0;
      diaries.forEach(d => {
        d.phases.forEach(p => {
          // If the phase is pending, in-progress, submitted, or changes-requested,
          // it means the escrow has been funded from the client but not released to the freelancer yet
          if (p.status !== "approved" && p.status !== "pending") {
            // Note: Since we deduct the amount from client balance when adding/initializing funded phases,
            // we count the funded active phases.
            upcomingPayments += (p.amount || 0);
          }
        });
      });

      return res.status(200).json({
        success: true,
        stats: {
          totalBalance,
          totalSpent,
          upcomingPayments
        }
      });
    } else if (role === "Freelancer") {
      // 1. Balance Left (unwithdrawn earnings)
      const balanceLeft = user.balance || 0;

      // 2. Total Earnings
      const earnedTxns = await Transaction.find({ userId, type: "Payment Released" });
      const totalEarnings = earnedTxns.reduce((sum, txn) => sum + txn.amount, 0);

      // 3. Amount Withdrawn
      const withdrawnTxns = await Transaction.find({ userId, type: "Withdrawal" });
      const amountWithdrawn = withdrawnTxns.reduce((sum, txn) => sum + txn.amount, 0);

      return res.status(200).json({
        success: true,
        stats: {
          totalEarnings,
          paymentsReceived: totalEarnings, // release-on-approval model
          amountWithdrawn,
          balanceLeft
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

    // Convert USD to INR (multiplier 80) and to paise (INR * 100)
    const usdToInrRate = 80;
    const amountInINR = amount * usdToInrRate;
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
        // Update contract spent ledger (leaves user wallet balance and contract status independent)
        contract.spent = (contract.spent || 0) + parseFloat(amount);
        await contract.save();

        // Log the Payment Released transaction
        await Transaction.create({
          userId,
          contractId,
          type: "Payment Released",
          amount: parseFloat(amount),
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
        status: "Paid",
        description: `Deposited $${amount} to wallet via Razorpay`,
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

    // Deduct from balance
    user.balance = (user.balance || 0) - parseFloat(amount);
    await user.save();

    // Log Transaction
    const referenceId = `WDN-${Math.floor(100000 + Math.random() * 900000)}`;
    const transaction = await Transaction.create({
      userId,
      contractId: contractId || null,
      type: "Withdrawal",
      amount: parseFloat(amount),
      status: "Processed",
      description: `Withdrew $${amount} from balance to local bank account`,
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
      amountPaid: txn.amount.toFixed(2)
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
