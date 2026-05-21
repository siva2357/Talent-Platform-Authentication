const express = require('express');
const router = express.Router();
const { identifier } = require('../middleware/identifier');
const { getAdminById, getAdminProfile } = require('../controllers/adminController');
// const { getRecruiters, getJobSeekers, getRecruiterProfileForAdmin, getJobSeekerProfileForAdmin} = require('../admin/userProfileController');


// router.get('/recruiters-list', identifier, getRecruiters);
// router.get('/jobSeekers-list', identifier, getJobSeekers);

// router.get('/recruiters/:userId/profile', identifier, getRecruiterProfileForAdmin);
// router.get('/jobSeekers/:userId/profile', identifier, getJobSeekerProfileForAdmin);

router.get('/profile', identifier, getAdminProfile);
router.get('/:id', identifier, getAdminById);

module.exports = router;