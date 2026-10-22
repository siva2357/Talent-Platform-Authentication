const bcrypt = require('bcrypt');
const AdminModel = require('../models/admin');
const User = require('../models/user');
const ClientProfile = require('../models/clientProfile');
const FreelancerProfile = require('../models/freelancerProfile');
const Contract = require('../models/contract');
const Transaction = require('../models/transaction');


const defaultAdmin = {
  registrationDetails: {
    fullName: "Admin User",
    userName: "admin",
    email: "creativehub.official08@gmail.com",
    password: "Siva@2357", // ensure this exists
    profilePicture: {
      fileName: "Profile picture",
      url: "https://res.cloudinary.com/dpp8aspqs/image/upload/v1737024440/Logo_qboacm.svg"
    },
    verified: true
  },
  role: "Admin"
};

exports.createDefaultAdmin = async () => {
  try {
    const adminExists = await AdminModel.findOne({
      'registrationDetails.email': defaultAdmin.registrationDetails.email
    });

    if (adminExists) {
      console.log('Default admin already exists.');
      return;
    }

    const plainPassword = defaultAdmin.registrationDetails.password;
    if (!plainPassword) {
      console.error(`Password is undefined for user: ${defaultAdmin.registrationDetails.email}`);
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newAdmin = new AdminModel({
      ...defaultAdmin,
      registrationDetails: {
        ...defaultAdmin.registrationDetails,
        password: hashedPassword
      }
    });

    await newAdmin.save();
    console.log('Default admin created successfully.');
  } catch (err) {
    console.error('Error creating default admin:', err);
  }
};


exports.getAdminById = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ message: 'Access denied' });
    }

    const admin = await AdminModel.findById(req.params.id).select('-registrationDetails.password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    return res.status(200).json(admin);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAdminProfile = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ message: 'Access denied' });
    }

    const adminId = req.userId || req.user?.userId; // Standard fallback to ensure ID is found

    const admin = await AdminModel.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    return res.status(200).json({
      message: 'Admin profile fetched successfully',
      data: admin
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};



// Get all clients
exports.getAllClients = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const clientUsers = await User.find({ role: "client" });
    const clientsData = [];

    for (const user of clientUsers) {
      const profile = await ClientProfile.findOne({ userId: user._id });
      const contracts = await Contract.find({ clientId: user._id });
      const spent = contracts.reduce((acc, c) => acc + (c.spent || 0), 0);

      clientsData.push({
        id: user._id.toString(),
        name: profile?.basicInformation?.fullName || user.registrationDetails.fullName,
        clientName: user.registrationDetails.fullName,
        email: user.registrationDetails.email,
        phoneNumber: user.registrationDetails.phoneNumber || "",
        projectsCount: contracts.length,
        status: user.status === 'active' ? 'Active' : (user.status === 'suspended' ? 'Suspended' : (user.status === 'blocked' ? 'Blocked' : 'Deactivated')),
        joinedDate: user.createdAt.toISOString().split('T')[0],
        industry: profile?.professionalDetails?.industry || "Tech Services",
        profileImage: profile?.basicInformation?.profilePhoto || null
      });
    }

    return res.status(200).json(clientsData);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update client status
exports.updateClientStatus = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "client") {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    let dbStatus = 'inactive';
    if (status === 'Active') dbStatus = 'active';
    else if (status === 'Suspended') dbStatus = 'suspended';
    else if (status === 'Blocked') dbStatus = 'blocked';
    else if (status === 'Deactivated') dbStatus = 'deactivated';

    user.status = dbStatus;
    await user.save();

    return res.status(200).json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get all freelancers
exports.getAllFreelancers = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const freelancerUsers = await User.find({ role: "freelancer" });
    const freelancersData = [];

    for (const user of freelancerUsers) {
      const profile = await FreelancerProfile.findOne({ userId: user._id });
      const contracts = await Contract.find({ applicants: { $elemMatch: { freelancerId: user._id } } });

      freelancersData.push({
        id: user._id.toString(),
        name: user.registrationDetails.fullName,
        email: user.registrationDetails.email,
        phoneNumber: user.registrationDetails.phoneNumber || "",
        completedProjects: contracts.filter(c => c.status === 'completed').length,
        status: user.status === 'active' ? 'Active' : (user.status === 'suspended' ? 'Suspended' : (user.status === 'blocked' ? 'Blocked' : 'Pending Approval')),
        joinedDate: user.createdAt.toISOString().split('T')[0],
        title: profile?.basicInformation?.professionalHeadline || "Freelancer Developer",
        profileImage: profile?.basicInformation?.profilePhoto || null
      });
    }

    return res.status(200).json(freelancersData);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update freelancer status
exports.updateFreelancerStatus = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "freelancer") {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    let dbStatus = 'inactive';
    if (status === 'Active') dbStatus = 'active';
    else if (status === 'Suspended') dbStatus = 'suspended';
    else if (status === 'Blocked') dbStatus = 'blocked';
    else if (status === 'Deactivated') dbStatus = 'deactivated';
    else if (status === 'Pending Approval') dbStatus = 'inactive';

    user.status = dbStatus;
    await user.save();

    return res.status(200).json({ success: true, message: `Status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Approve freelancer
exports.approveFreelancer = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "freelancer") {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    user.status = 'active';
    await user.save();

    return res.status(200).json({ success: true, message: 'Freelancer approved successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Admin Dashboard stats
exports.getAdminStats = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const totalClients = await User.countDocuments({ role: "client" });
    const totalFreelancers = await User.countDocuments({ role: "freelancer" });
    const activeContracts = await Contract.countDocuments({ status: "in-progress" });

    // Calculate commissions dynamically by summing platform fees
    const txs = await Transaction.find({});
    const totalCommissions = txs.reduce((acc, t) => acc + (t.platformFee || 0), 0);

    // Build recent activities list dynamically
    const recentClients = await User.find({ role: "client" }).sort({ createdAt: -1 }).limit(3);
    const recentFreelancers = await User.find({ role: "freelancer" }).sort({ createdAt: -1 }).limit(3);

    const activities = [];

    recentClients.forEach(c => {
      activities.push({
        id: c._id.toString(),
        user: c.registrationDetails.fullName,
        action: 'registered as a hiring client.',
        project: 'Client Registration',
        time: 'Recently',
        icon: 'bi-person-plus-fill',
        type: 'approval'
      });
    });

    recentFreelancers.forEach(f => {
      activities.push({
        id: f._id.toString(),
        user: f.registrationDetails.fullName,
        action: 'submitted profile for review.',
        project: 'Freelancer Profile',
        time: 'Recently',
        icon: 'bi-person-badge-fill',
        type: 'approval'
      });
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = [];
    const clientsData = [0, 0, 0, 0, 0, 0];
    const freelancersData = [0, 0, 0, 0, 0, 0];

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
    }

    const allClients = await User.find({ role: "client", createdAt: { $gte: sixMonthsAgo } });
    allClients.forEach(u => {
      const diff = now.getMonth() - u.createdAt.getMonth() + (12 * (now.getFullYear() - u.createdAt.getFullYear()));
      if (diff >= 0 && diff <= 5) {
        clientsData[5 - diff]++;
      }
    });

    const allFreelancers = await User.find({ role: "freelancer", createdAt: { $gte: sixMonthsAgo } });
    allFreelancers.forEach(u => {
      const diff = now.getMonth() - u.createdAt.getMonth() + (12 * (now.getFullYear() - u.createdAt.getFullYear()));
      if (diff >= 0 && diff <= 5) {
        freelancersData[5 - diff]++;
      }
    });

    const completedContracts = await Contract.countDocuments({ status: "completed" });
    const openContracts = await Contract.countDocuments({ status: "open" });
    const closedContracts = await Contract.countDocuments({ status: "closed" });

    // Calculate actual quarterly revenue from transactions for current year
    const currentYear = now.getFullYear();
    const quarterlyRevenue = [0, 0, 0, 0];
    txs.forEach(t => {
      if (t.platformFee && t.createdAt) {
        const txDate = new Date(t.createdAt);
        if (txDate.getFullYear() === currentYear) {
          const q = Math.floor(txDate.getMonth() / 3);
          if (q >= 0 && q <= 3) {
            quarterlyRevenue[q] += t.platformFee;
          }
        }
      }
    });

    // Fallback if all quarterly revenues are 0 but totalCommissions > 0
    if (totalCommissions > 0 && quarterlyRevenue.every(v => v === 0)) {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      quarterlyRevenue[currentQuarter] = totalCommissions;
    }

    const chartData = {
      labels,
      clients: clientsData,
      freelancers: freelancersData,
      revenue: quarterlyRevenue,
      contracts: [activeContracts, completedContracts, openContracts, closedContracts]
    };

    return res.status(200).json({
      totalClients,
      totalFreelancers,
      completedContracts,
      totalCommissions,
      activities: activities.slice(0, 5),
      chartData
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// GET /api/admin/finances/transactions
exports.getAdminTransactions = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const formattedTxs = [];

    // 1. Payout and withdrawal requests
    const payoutTxs = await Transaction.find({ type: { $in: ['Payout', 'Withdrawal'] } })
      .populate('userId', 'registrationDetails.fullName')
      .populate({
        path: 'contractId',
        populate: { path: 'clientId', select: 'registrationDetails.fullName' }
      });

    const handledContractIds = new Set();

    for (const p of payoutTxs) {
      let clientFee = 0;
      let clientPayment = p.amount;
      // Freelancer deduction must be 7.5% of base spent
      const freelancerDeduction = Math.round(p.amount * 0.075);
      const freelancerPayout = p.amount - freelancerDeduction;

      if (p.contractId?._id) {
        const cIdStr = p.contractId._id.toString();
        handledContractIds.add(cIdStr);

        const contractTxs = await Transaction.find({ contractId: p.contractId._id });
        const escrowTx = contractTxs.find(t => t.type === 'Escrow Funded' || t.type === 'Deposit');

        clientFee = escrowTx ? (escrowTx.platformFee || 0) : Math.round(p.amount * 0.10);
        clientPayment = escrowTx ? ((escrowTx.amount || 0) + clientFee) : (p.amount + clientFee);
      }

      const totalPlatformFee = clientFee + freelancerDeduction;

      formattedTxs.push({
        id: p._id.toString(),
        contractTitle: p.contractId?.contractTitle || "Direct Freelancer Payout",
        clientName: p.contractId?.clientId?.registrationDetails?.fullName || "-",
        freelancerName: p.userId?.registrationDetails?.fullName || "Freelancer",
        budget: clientPayment,
        freelancerPayment: freelancerPayout,
        amount: clientPayment,
        platformFee: totalPlatformFee,
        clientTax: clientFee,
        freelancerDeduction: freelancerDeduction,
        status: p.status === 'Processed' || p.status === 'Paid' ? 'Completed' : (p.status === 'Pending' ? 'Pending' : p.status),
        date: p.createdAt ? p.createdAt.toISOString().split('T')[0] : "",
        type: "Payout"
      });
    }

    // 2. Platform contracts and their financial records
    const contracts = await Contract.find({})
      .populate('clientId', 'registrationDetails.fullName')
      .populate('applicants.freelancerId', 'registrationDetails.fullName');

    for (const contract of contracts) {
      // If contract already has a payout transaction, it is already represented above
      if (handledContractIds.has(contract._id.toString())) {
        continue;
      }

      const contractTxs = await Transaction.find({ contractId: contract._id });
      const escrowTx = contractTxs.find(t => t.type === 'Escrow Funded' || t.type === 'Deposit');

      const freelancerUser = contract.applicants?.[0]?.freelancerId;
      const freelancerName = freelancerUser?.registrationDetails?.fullName || "Assigned Freelancer";

      const baseBudget = (contract.spent && contract.spent > 0) ? contract.spent : (contract.estimatedBudget || 0);
      const clientFee = escrowTx ? (escrowTx.platformFee || 0) : Math.round(baseBudget * 0.10);
      const clientPayment = escrowTx ? ((escrowTx.amount || 0) + clientFee) : (baseBudget + clientFee);

      const freelancerDeduction = Math.round(baseBudget * 0.075);
      const freelancerPayout = Math.max(0, baseBudget - freelancerDeduction);
      const totalPlatformFee = clientFee + freelancerDeduction;

      let status = 'Pending';
      let type = 'Contract Escrow';

      if (contract.status === 'completed') {
        // Contract is completed, but freelancer payout has not been disbursed yet
        status = 'Pending';
        type = 'Payout';
      } else if (contract.status === 'in progress') {
        status = 'In Progress';
        type = 'Contract Escrow';
      } else {
        status = 'Pending';
        type = 'Contract Escrow';
      }

      formattedTxs.push({
        id: contract._id.toString(),
        contractTitle: contract.contractTitle || "Untitled Contract",
        clientName: contract.clientId?.registrationDetails?.fullName || "Client",
        freelancerName: freelancerName,
        budget: clientPayment,
        freelancerPayment: freelancerPayout,
        amount: clientPayment,
        platformFee: totalPlatformFee,
        clientTax: clientFee,
        freelancerDeduction: freelancerDeduction,
        status: status,
        date: contract.createdAt ? contract.createdAt.toISOString().split('T')[0] : "",
        type: type
      });
    }

    // Sort by date descending
    formattedTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json(formattedTxs);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// GET /api/admin/finances/stats
exports.getAdminFinancialStats = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const txs = await Transaction.find({});

    const payoutTxs = txs.filter(t => t.type === 'Payout' || t.type === 'Withdrawal');

    const completedPayouts = payoutTxs.filter(t => t.status === 'Processed' || t.status === 'Completed' || t.status === 'Paid');
    const pendingPayouts = payoutTxs.filter(t => t.status === 'Pending');

    // Count pending amounts for completed contracts without a payout transaction yet
    const handledContractIds = new Set(
      payoutTxs.filter(t => t.contractId).map(t => t.contractId.toString())
    );

    const unhandledCompletedContracts = await Contract.find({
      status: 'completed',
      _id: { $nin: Array.from(handledContractIds) }
    });

    const unhandledPendingAmount = unhandledCompletedContracts.reduce((sum, c) => {
      const spent = (c.spent && c.spent > 0) ? c.spent : (c.estimatedBudget || 0);
      return sum + Math.round(spent * 0.90);
    }, 0);

    // Calculate total platform commissions across all platform transactions
    const platformCommissions = txs.reduce((sum, t) => sum + (t.platformFee || 0), 0);
    const pendingWithdrawals = pendingPayouts.reduce((sum, t) => sum + (t.amount || 0), 0) + unhandledPendingAmount;
    const successfulPayouts = completedPayouts.length;

    return res.status(200).json({
      platformCommissions,
      pendingWithdrawals,
      successfulPayouts,
      growthPercent: 18.5
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/finances/status-options
exports.getAdminFinanceStatusOptions = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const options = [
      { label: 'All Statuses', value: 'All Statuses' },
      { label: 'Completed', value: 'Completed' },
      { label: 'Pending', value: 'Pending' },
      { label: 'In Progress', value: 'In Progress' }
    ];
    return res.status(200).json(options);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




// GET /api/admin/users/status-options
exports.getUserStatusOptions = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const options = [
      { label: 'All Statuses', value: 'All Statuses' },
      { label: 'Active', value: 'Active' },
      { label: 'Pending Approval', value: 'Pending Approval' },
      { label: 'Suspended', value: 'Suspended' },
      { label: 'Blocked', value: 'Blocked' },
      { label: 'Deactivated', value: 'Deactivated' }
    ];
    return res.status(200).json(options);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// POST /api/admin/payout/:transactionId
exports.processManualPayout = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { transactionId } = req.params;

    // 1. Check if transactionId is an existing Transaction
    let transaction = await Transaction.findById(transactionId);

    if (transaction) {
      if (transaction.type !== 'Payout' && transaction.type !== 'Withdrawal') {
        return res.status(400).json({ success: false, message: 'Invalid transaction type for payout' });
      }

      if (transaction.status === 'Processed' || transaction.status === 'Paid') {
        return res.status(400).json({ success: false, message: 'Payout has already been processed' });
      }

      const freelancer = await User.findById(transaction.userId);
      if (!freelancer) {
        return res.status(404).json({ success: false, message: 'Freelancer not found' });
      }

      // Mark transaction processed
      transaction.status = 'Processed';
      await transaction.save();

      return res.status(200).json({ success: true, message: 'Payout processed successfully', transaction });
    }

    // 2. Check if transactionId is a Contract ID
    const contract = await Contract.findById(transactionId).populate('applicants.freelancerId');
    if (contract) {
      const freelancerUser = contract.applicants?.[0]?.freelancerId;
      if (!freelancerUser) {
        return res.status(404).json({ success: false, message: 'No freelancer assigned to this contract' });
      }

      const freelancerId = freelancerUser._id || freelancerUser;
      const freelancer = await User.findById(freelancerId);
      if (!freelancer) {
        return res.status(404).json({ success: false, message: 'Freelancer not found' });
      }

      const baseSpent = (contract.spent && contract.spent > 0) ? contract.spent : (contract.estimatedBudget || 0);
      const freelancerFee = Math.round(baseSpent * 0.075);
      const netPayout = Math.max(0, baseSpent - freelancerFee);

      // Deduct baseSpent from freelancer wallet balance if present
      if (freelancer.balance && freelancer.balance >= baseSpent) {
        freelancer.balance -= baseSpent;
        await freelancer.save();
      } else if (freelancer.balance && freelancer.balance >= netPayout) {
        freelancer.balance -= netPayout;
        await freelancer.save();
      }

      // Create new processed Payout transaction
      transaction = await Transaction.create({
        userId: freelancer._id,
        contractId: contract._id,
        type: 'Payout',
        amount: baseSpent,
        platformFee: freelancerFee,
        status: 'Processed',
        description: `Manual payout processed by admin for contract "${contract.contractTitle}"`,
        referenceId: `PO-${Math.floor(100000 + Math.random() * 900000)}`
      });

      return res.status(200).json({ success: true, message: 'Payout processed successfully', transaction });
    }

    return res.status(404).json({ success: false, message: 'Transaction or Contract not found' });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
