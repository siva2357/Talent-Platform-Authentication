const express = require('express');
const router = express.Router();
const { identifier } = require('../middleware/identifier');
const { 
  getAdminById, 
  getAdminProfile,
  getAllClients,
  updateClientStatus,
  getAllFreelancers,
  updateFreelancerStatus,
  approveFreelancer,
  getAdminStats,
  getAdminTransactions,
  getAdminFinancialStats,
  getAdminReports,
  generateAdminReport
} = require('../controllers/adminController');

router.get('/profile', identifier, getAdminProfile);
router.get('/clients', identifier, getAllClients);
router.patch('/clients/:id/status', identifier, updateClientStatus);
router.get('/freelancers', identifier, getAllFreelancers);
router.patch('/freelancers/:id/status', identifier, updateFreelancerStatus);
router.post('/freelancers/:id/approve', identifier, approveFreelancer);
router.get('/dashboard/stats', identifier, getAdminStats);

router.get('/finances/transactions', identifier, getAdminTransactions);
router.get('/finances/stats', identifier, getAdminFinancialStats);
router.get('/reports', identifier, getAdminReports);
router.post('/reports', identifier, generateAdminReport);

router.get('/:id', identifier, getAdminById);

module.exports = router;