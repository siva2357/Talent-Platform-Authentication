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
    role: "admin"
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
        const adminId = req.user.userId; // ✅ from JWT middleware

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






