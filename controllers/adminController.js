const bcrypt = require('bcrypt');
const AdminModel = require('../models/admin');

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
        if (req.role !== "Admin") {
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
        if (req.role !== "Admin") {
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

const User = require('../models/user');
const ClientProfile = require('../models/clientProfile');
const FreelancerProfile = require('../models/freelancerProfile');
const Contract = require('../models/contract');
const Transaction = require('../models/transaction');

// Get all clients
exports.getAllClients = async (req, res) => {
  try {
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const clientUsers = await User.find({ role: "Client" });
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
        spent: spent,
        projectsCount: contracts.length,
        status: user.status === 'active' ? 'Active' : (user.status === 'suspended' ? 'Suspended' : (user.status === 'blocked' ? 'Blocked' : 'Deactivated')),
        joinedDate: user.createdAt.toISOString().split('T')[0],
        logoColor: 'indigo',
        industry: profile?.professionalDetails?.industry || "Tech Services"
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
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "Client") {
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
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const freelancerUsers = await User.find({ role: "Freelancer" });
    const freelancersData = [];

    for (const user of freelancerUsers) {
      const profile = await FreelancerProfile.findOne({ userId: user._id });
      const contracts = await Contract.find({ applicants: { $elemMatch: { freelancerId: user._id } } });
      
      freelancersData.push({
        id: user._id.toString(),
        name: user.registrationDetails.fullName,
        email: user.registrationDetails.email,
        phoneNumber: user.registrationDetails.phoneNumber || "",
        skills: profile?.professionalDetails?.skills || [],
        hourlyRate: profile?.hourlyRate || 0,
        completedProjects: contracts.filter(c => c.status === 'completed').length,
        earnings: contracts.reduce((acc, c) => acc + (c.spent || 0), 0),
        status: user.status === 'active' ? 'Active' : (user.status === 'suspended' ? 'Suspended' : (user.status === 'blocked' ? 'Blocked' : 'Pending Approval')),
        joinedDate: user.createdAt.toISOString().split('T')[0],
        rating: 5.0,
        title: profile?.basicInformation?.professionalHeadline || "Freelancer Developer"
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
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "Freelancer") {
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
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== "Freelancer") {
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
    if (req.role !== "Admin") {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const totalClients = await User.countDocuments({ role: "Client" });
    const totalFreelancers = await User.countDocuments({ role: "Freelancer" });
    const activeContracts = await Contract.countDocuments({ status: "in progress" });

    // Calculate commissions dynamically by summing platform fees
    const txs = await Transaction.find({});
    const totalCommissions = txs.reduce((acc, t) => acc + (t.platformFee || 0), 0);

    // Build recent activities list dynamically
    const recentClients = await User.find({ role: "Client" }).sort({ createdAt: -1 }).limit(3);
    const recentFreelancers = await User.find({ role: "Freelancer" }).sort({ createdAt: -1 }).limit(3);
    
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

    return res.status(200).json({
      totalClients,
      totalFreelancers,
      activeContracts,
      totalCommissions,
      activities: activities.slice(0, 5)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};






