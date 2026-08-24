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
    email: "admin@gmail.com",
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
    const activeContracts = await Contract.countDocuments({ status: "in progress" });

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

    const chartData = {
      labels,
      clients: clientsData,
      freelancers: freelancersData,
      revenue: [totalCommissions * 0.4, totalCommissions * 0.3, totalCommissions * 0.2, totalCommissions * 0.1],
      contracts: [activeContracts, completedContracts, openContracts, closedContracts]
    };

    return res.status(200).json({
      totalClients,
      totalFreelancers,
      activeContracts,
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

    const payoutTxs = await Transaction.find({ type: 'Payout' })
      .populate('userId', 'registrationDetails.fullName')
      .populate({
        path: 'contractId',
        populate: { path: 'clientId', select: 'registrationDetails.fullName' }
      });

    for (const p of payoutTxs) {
      formattedTxs.push({
        id: p._id.toString(),
        contractTitle: p.contractId?.contractTitle || "Manual Payout",
        clientName: p.contractId?.clientId?.registrationDetails?.fullName || "-",
        freelancerName: p.userId?.registrationDetails?.fullName || "freelancer",
        budget: p.amount,
        freelancerPayment: p.amount - (p.platformFee || 0),
        amount: p.amount,
        platformFee: p.platformFee || 0,
        status: p.status === 'Processed' || p.status === 'Paid' ? 'Completed' : p.status,
        date: p.createdAt ? p.createdAt.toISOString().split('T')[0] : "",
        type: "Payout"
      });
    }

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

    const platformCommissions = payoutTxs.reduce((sum, t) => sum + (t.platformFee || 0), 0);
    const pendingWithdrawals = pendingPayouts.reduce((sum, t) => sum + (t.amount || 0), 0);
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


// GET /api/admin/reports
exports.getAdminReports = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const SystemReport = require('../models/systemReport');
    let reports = await SystemReport.find().sort({ createdAt: -1 });

    if (reports.length === 0) {
      const defaults = [
        { title: 'Q2 Platform Revenue & Transaction Audit', description: 'Complete audit of commissions, deposits, and withdrawal margins for Q2.', category: 'Financial', size: '2.4 MB' },
        { title: 'Monthly Active Users & Growth Metrics', description: 'Breakdown of new client signups, freelancer approvals, and retention rates.', category: 'User Activity', size: '1.8 MB' },
        { title: 'Job Matching & Fill Rate Analysis', description: 'Report measuring time-to-hire, project success rates, and category demand.', category: 'Platform Health', size: '940 KB' }
      ];
      reports = await SystemReport.insertMany(defaults);
      reports = await SystemReport.find().sort({ createdAt: -1 });
    }

    const formattedReports = reports.map(r => ({
      id: r._id.toString(),
      title: r.title,
      description: r.description,
      category: r.category,
      generatedDate: r.createdAt.toISOString().split('T')[0],
      downloadUrl: r.downloadUrl,
      size: r.size
    }));

    return res.status(200).json(formattedReports);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// POST /api/admin/reports
exports.generateAdminReport = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { title, category, description } = req.body;
    if (!title || !category || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const SystemReport = require('../models/systemReport');
    const newReport = new SystemReport({
      title,
      category,
      description,
      size: '120 KB',
      downloadUrl: '#'
    });

    await newReport.save();

    return res.status(201).json({
      success: true,
      report: {
        id: newReport._id.toString(),
        title: newReport.title,
        description: newReport.description,
        category: newReport.category,
        generatedDate: newReport.createdAt.toISOString().split('T')[0],
        downloadUrl: newReport.downloadUrl,
        size: newReport.size
      }
    });
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
    const Transaction = require('../models/transaction');
    const User = require('../models/user');

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.type !== 'Payout' || transaction.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Invalid transaction type or status for payout' });
    }

    const freelancer = await User.findById(transaction.userId);
    if (!freelancer) {
      return res.status(404).json({ success: false, message: 'Freelancer not found' });
    }

    // In a real scenario, this is where you'd call RazorpayX API
    // using axios to https://api.razorpay.com/v1/payouts
    // For now, we simulate success

    transaction.status = 'Processed';
    // Deduct from freelancer balance
    if (freelancer.balance >= transaction.amount) {
      freelancer.balance -= transaction.amount;
      await freelancer.save();
    } else {
      return res.status(400).json({ success: false, message: 'Insufficient freelancer balance' });
    }

    await transaction.save();

    return res.status(200).json({ success: true, message: 'Payout processed successfully', transaction });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
